import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

interface User {
  username: string
  role: "admin" | "staff"
}

interface AuthContextValue {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>
}

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

/** Decode JWT exp claim without a library. Returns expiry as ms timestamp. */
function getTokenExpMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("auth_user")
    return stored ? JSON.parse(stored) : null
  })

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref so logout/apiFetch always see latest without re-creating callbacks
  const logoutRef = useRef<() => Promise<void>>()

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const access_token = localStorage.getItem("access_token")
    const refresh_token = localStorage.getItem("refresh_token")
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    }).catch(() => {})

    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("auth_user")
    setUser(null)
  }, [])

  logoutRef.current = logout

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expMs = getTokenExpMs(accessToken)
    if (!expMs) return
    const delay = expMs - Date.now() - REFRESH_BEFORE_EXPIRY_MS
    if (delay <= 0) return // already in the window — silentRefresh will handle it
    refreshTimerRef.current = setTimeout(() => silentRefreshRef.current?.(), delay)
  }, [])

  const silentRefreshRef = useRef<() => Promise<void>>()

  const silentRefresh = useCallback(async () => {
    const refresh_token = localStorage.getItem("refresh_token")
    const access_token = localStorage.getItem("access_token")
    if (!refresh_token || !access_token) return

    // Only refresh if within 5 min of expiry (or already expired)
    const expMs = getTokenExpMs(access_token)
    if (expMs && expMs - Date.now() > REFRESH_BEFORE_EXPIRY_MS) {
      // Not near expiry yet — just reschedule
      scheduleRefresh(access_token)
      return
    }

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    })

    if (!res.ok) {
      await logoutRef.current?.()
      return
    }

    const { access_token: newAccess, refresh_token: newRefresh } = await res.json()
    localStorage.setItem("access_token", newAccess)
    localStorage.setItem("refresh_token", newRefresh)
    scheduleRefresh(newAccess)
  }, [scheduleRefresh])

  silentRefreshRef.current = silentRefresh

  // On mount: refresh if near expiry, then schedule future refreshes
  useEffect(() => {
    silentRefresh()
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? "Login failed")
    }

    const { access_token, refresh_token } = await res.json()
    localStorage.setItem("access_token", access_token)
    localStorage.setItem("refresh_token", refresh_token)
    scheduleRefresh(access_token)

    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const me: User = await meRes.json()
    setUser(me)
    localStorage.setItem("auth_user", JSON.stringify(me))
  }, [])

  /**
   * Drop-in fetch replacement for API calls.
   * Automatically injects Authorization header, and on 401 attempts
   * a silent token refresh once before giving up and logging out.
   */
  const apiFetch = useCallback(async (input: string, init: RequestInit = {}): Promise<Response> => {
    const withAuth = (token: string): RequestInit => ({
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })

    const access_token = localStorage.getItem("access_token") ?? ""
    const res = await fetch(`${API_BASE}${input}`, withAuth(access_token))

    if (res.status !== 401) return res

    // Try refresh
    const refresh_token = localStorage.getItem("refresh_token")
    if (!refresh_token) {
      await logoutRef.current?.()
      return res
    }

    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    })

    if (!refreshRes.ok) {
      await logoutRef.current?.()
      return res
    }

    const { access_token: newAccess, refresh_token: newRefresh } = await refreshRes.json()
    localStorage.setItem("access_token", newAccess)
    localStorage.setItem("refresh_token", newRefresh)

    // Retry original request with new token
    return fetch(`${API_BASE}${input}`, withAuth(newAccess))
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
