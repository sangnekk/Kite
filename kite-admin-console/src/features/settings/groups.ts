export type FieldKind = "text" | "number" | "secret" | "bool" | "megabytes"

export interface FieldSpec {
  key: string
  label: string
  kind: FieldKind
  description?: string
  placeholder?: string
}

export interface GroupSpec {
  id: string
  label: string
  description: string
  fields: FieldSpec[]
}

export const GROUPS: GroupSpec[] = [
  {
    id: "billing",
    label: "Thanh toán",
    description: "Tài khoản nhận tiền và tích hợp SePay. Áp dụng ngay cho các giao dịch mới.",
    fields: [
      { key: "transfer_code_prefix", label: "Tiền tố mã chuyển khoản", kind: "text", description: "Mã chuyển khoản có dạng TIỀNTỐ + số, ví dụ KITE123." },
      { key: "merchant_bank_name", label: "Ngân hàng nhận tiền", kind: "text", placeholder: "MBBank" },
      { key: "merchant_account_no", label: "Số tài khoản", kind: "text", description: "Giao dịch báo về phải trùng số tài khoản này mới được chấp nhận." },
      { key: "checkout_ttl_minutes", label: "Thời gian giữ mã QR (phút)", kind: "number" },
      { key: "sepay_merchant_id", label: "SePay merchant ID", kind: "text" },
      { key: "sepay_secret_key", label: "SePay secret key", kind: "secret", description: "Khóa xác thực thông báo tiền về (IPN) từ SePay." },
      { key: "sepay_bearer_token", label: "SePay API token", kind: "secret" },
      { key: "sepay_bank_account_xid", label: "SePay bank account XID", kind: "text" },
      { key: "sepay_va_prefix", label: "Tiền tố tài khoản ảo (VA)", kind: "text" },
      { key: "sepay_qrcode_template", label: "Mẫu mã QR", kind: "text", placeholder: "compact" },
      { key: "sepay_with_qrcode", label: "Hiện mã QR", kind: "bool" },
      { key: "sepay_checkout_ttl_minutes", label: "SePay checkout TTL (phút)", kind: "number" },
      { key: "sepay_checkout_base_url", label: "SePay checkout URL", kind: "text", placeholder: "https://pay.sepay.vn" },
      { key: "sepay_api_base_url", label: "SePay API URL", kind: "text", placeholder: "https://userapi.sepay.vn/v2" },
      { key: "webhook_hmac_secret", label: "HMAC secret (cũ)", kind: "secret", description: "Không còn được dùng, giữ lại để tương thích." },
    ],
  },
  {
    id: "limits",
    label: "Giới hạn người dùng",
    description: "Giới hạn áp dụng cho mọi người dùng, bất kể gói.",
    fields: [
      { key: "max_apps_per_user", label: "Số ứng dụng tối đa mỗi người", kind: "number" },
      { key: "max_asset_size", label: "Dung lượng tệp tải lên tối đa (MB)", kind: "megabytes", description: "0 = không giới hạn." },
    ],
  },
  {
    id: "discord",
    label: "Discord",
    description: "Bot dùng để cấp vai trò theo gói trong máy chủ hỗ trợ.",
    fields: [
      { key: "bot_token", label: "Bot token", kind: "secret" },
      { key: "guild_id", label: "ID máy chủ", kind: "text", description: "Để trống để tắt việc cấp vai trò." },
    ],
  },
  {
    id: "engine",
    label: "Engine",
    description: "Giới hạn khi chạy luồng của bot.",
    fields: [
      { key: "max_stack_depth", label: "Độ sâu ngăn xếp tối đa", kind: "number" },
      { key: "max_operations", label: "Số thao tác tối đa mỗi lần chạy", kind: "number" },
      { key: "max_credits", label: "Credits tối đa mỗi lần chạy", kind: "number" },
      {
        key: "component_resume_point_ttl_days",
        label: "Nút/menu hết hạn sau (ngày)",
        kind: "number",
        description: "0 = nút bấm và menu trên tin nhắn của bot hoạt động mãi mãi.",
      },
    ],
  },
  {
    id: "ai",
    label: "AI",
    description: "Nhà cung cấp và mô hình AI mà người dùng chọn trong luồng.",
    fields: [],
  },
]

export const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]))

/** Query key of GET /settings, shared by the pages and the forms that refresh it. */
export const SETTINGS_KEY = ["settings"] as const
