// Client for the admin API of kite-service. The console is served by the same
// server, so the session cookie is sent automatically and nothing is stored in
// the browser.

export const API_BASE = "/v1/admin"

interface Envelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export type Params = Record<string, string | number | boolean | undefined | null>

/** Builds a query string, leaving out empty values. */
export function queryString(params?: Params): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ""
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  params?: Params
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", params, body, signal } = options

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}${queryString(params)}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new ApiError(0, "network_error", "Không kết nối được tới máy chủ")
  }

  let envelope: Envelope<T> | null = null
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    // Not JSON (a proxy error page, an empty body...).
  }

  if (!response.ok || !envelope?.success) {
    const error = envelope?.error
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? `Yêu cầu thất bại (${response.status})`
    )
  }

  return envelope.data as T
}

const MESSAGES: Record<string, string> = {
  network_error: "Không kết nối được tới máy chủ",
  unauthorized: "Phiên đăng nhập đã hết hạn",
  not_admin: "Tài khoản này không có quyền vào trang quản trị",
  insufficient_role: "Bạn không có quyền thực hiện thao tác này",
  too_many_requests: "Bạn thao tác quá nhanh, thử lại sau ít phút",
  not_found: "Không tìm thấy dữ liệu",
  plan_already_active: "Ứng dụng này đang có gói đang hoạt động",
  payment_session_not_pending: "Giao dịch này không còn ở trạng thái chờ",
  default_required: "Phải luôn có một gói mặc định: hãy đặt gói khác làm mặc định",
  cannot_archive_default: "Không thể lưu trữ gói mặc định",
  owner_is_implicit: "Chủ hệ thống luôn có toàn quyền và không thể chỉnh sửa",
}

/** A message that can be shown to the user for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return MESSAGES[err.code] ?? err.message
  }
  if (err instanceof Error) return err.message
  return "Đã xảy ra lỗi không xác định"
}
