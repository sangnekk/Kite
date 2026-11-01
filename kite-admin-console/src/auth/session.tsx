import { createContext, useContext, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Outlet } from "react-router"
import { LogIn, ShieldX, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, api, errorMessage } from "@/lib/api"
import type { Me, Role } from "@/lib/types"

export const ROLE_RANK: Record<Role, number> = { staff: 1, admin: 2, owner: 3 }

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Chủ hệ thống",
  admin: "Quản trị viên",
  staff: "Nhân viên",
}

/** Whether `role` is at least `min`. Mirrors the checks of the API. */
export function atLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/me"),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

const MeContext = createContext<Me | null>(null)

/** The signed-in admin. Only usable below AuthGate. */
export function useCurrentAdmin(): Me {
  const me = useContext(MeContext)
  if (!me) throw new Error("useCurrentAdmin must be used inside AuthGate")
  return me
}

/** Whether the signed-in admin has at least the given role. */
export function useCan(min: Role): boolean {
  return atLeast(useCurrentAdmin().role, min)
}

/** Renders its children only for admins with at least the given role. */
export function Can({ role, children, fallback = null }: { role: Role; children: ReactNode; fallback?: ReactNode }) {
  return useCan(role) ? <>{children}</> : <>{fallback}</>
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center bg-background p-6">{children}</div>
}

function loginUrl(): string {
  // Come back to the page the admin was on once Discord has signed them in.
  return `/v1/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
}

export async function logout(): Promise<void> {
  try {
    await fetch("/v1/auth/logout", { method: "POST", credentials: "same-origin" })
  } finally {
    window.location.assign("/admin/")
  }
}

function LoginScreen() {
  return (
    <Screen>
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          K
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Vibe Bot - Quản trị</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập bằng tài khoản Discord đã được cấp quyền.</p>
        </div>
        <Button className="w-full" asChild>
          <a href={loginUrl()}>
            <LogIn /> Đăng nhập với Discord
          </a>
        </Button>
      </div>
    </Screen>
  )
}

function NoAccessScreen() {
  return (
    <Screen>
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldX className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản Discord này chưa được cấp quyền vào trang quản trị. Hãy nhờ chủ hệ thống thêm bạn vào danh sách
            nhân sự.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => void logout()}>
          Đăng nhập bằng tài khoản khác
        </Button>
      </div>
    </Screen>
  )
}

/**
 * Everything below it needs a signed-in admin. It shows the Discord login when
 * there is no session, and an explanation when the account is not an admin.
 */
export function AuthGate() {
  const me = useMe()
  const queryClient = useQueryClient()

  if (me.isPending) {
    return (
      <Screen>
        <Spinner className="size-6 text-muted-foreground" />
      </Screen>
    )
  }

  if (me.error) {
    if (me.error instanceof ApiError && me.error.status === 401) return <LoginScreen />
    if (me.error instanceof ApiError && me.error.code === "not_admin") return <NoAccessScreen />

    return (
      <Screen>
        <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <TriangleAlert className="mx-auto size-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{errorMessage(me.error)}</p>
          <Button variant="outline" onClick={() => void queryClient.refetchQueries({ queryKey: ["me"] })}>
            Thử lại
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <MeContext.Provider value={me.data}>
      <Outlet />
    </MeContext.Provider>
  )
}
