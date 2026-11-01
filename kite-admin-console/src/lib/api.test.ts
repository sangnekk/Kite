import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, api, errorMessage, queryString } from "./api"

function respond(status: number, body: unknown, raw = false) {
  return vi.fn().mockResolvedValue(
    new Response(raw ? (body as string) : JSON.stringify(body), { status })
  )
}

/** Awaits a call that must fail and returns its error. */
async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (e) {
    return e as ApiError
  }
  throw new Error("expected the call to fail")
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("queryString", () => {
  it("leaves out empty values and encodes the rest", () => {
    expect(queryString({ search: "a b&c", page: 2, status: "", level: undefined, x: null })).toBe(
      "?search=a+b%26c&page=2"
    )
    expect(queryString({})).toBe("")
    expect(queryString()).toBe("")
  })

  it("keeps false and 0", () => {
    expect(queryString({ a: false, b: 0 })).toBe("?a=false&b=0")
  })
})

describe("api", () => {
  it("unwraps the envelope and calls /v1/admin with the session cookie", async () => {
    const fetchMock = respond(200, { success: true, data: { total: 3 } })
    vi.stubGlobal("fetch", fetchMock)

    const data = await api<{ total: number }>("/users", { params: { page: 2 } })

    expect(data).toEqual({ total: 3 })
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/admin/users?page=2",
      expect.objectContaining({ method: "GET", credentials: "same-origin" })
    )
  })

  it("sends JSON bodies with the right header", async () => {
    const fetchMock = respond(200, { success: true, data: {} })
    vi.stubGlobal("fetch", fetchMock)

    await api("/staff", { method: "POST", body: { role: "staff" } })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe("POST")
    expect(init.body).toBe('{"role":"staff"}')
    expect(init.headers).toEqual({ "Content-Type": "application/json" })
  })

  it("turns API errors into ApiError with status and code", async () => {
    vi.stubGlobal(
      "fetch",
      respond(403, { success: false, error: { code: "insufficient_role", message: "no" } })
    )

    const err = await failure(api("/plans", { method: "POST" }))

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(403)
    expect(err.code).toBe("insufficient_role")
  })

  it("survives a non-JSON error page", async () => {
    vi.stubGlobal("fetch", respond(502, "<html>Bad gateway</html>", true))

    const err = await failure(api("/users"))

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(502)
    expect(err.message).toContain("502")
  })

  it("treats success:false on a 200 as an error", async () => {
    vi.stubGlobal("fetch", respond(200, { success: false, error: { code: "x", message: "boom" } }))
    await expect(api("/users")).rejects.toThrow("boom")
  })

  it("reports an unreachable server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))

    const err = await failure(api("/users"))

    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe("network_error")
    expect(err.status).toBe(0)
  })

  it("lets aborts through untouched so queries can cancel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"))
    )
    await expect(api("/users")).rejects.toMatchObject({ name: "AbortError" })
  })
})

describe("errorMessage", () => {
  it("prefers the Vietnamese message of known codes", () => {
    expect(errorMessage(new ApiError(403, "insufficient_role", "english"))).toContain("quyền")
  })

  it("falls back to the server message for unknown codes", () => {
    expect(errorMessage(new ApiError(400, "invalid_plan", "title is required"))).toBe("title is required")
  })

  it("handles plain errors and unknown values", () => {
    expect(errorMessage(new Error("oops"))).toBe("oops")
    expect(errorMessage("weird")).toBe("Đã xảy ra lỗi không xác định")
  })
})
