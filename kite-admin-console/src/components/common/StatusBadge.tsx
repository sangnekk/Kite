import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Tone = "success" | "info" | "warning" | "danger" | "muted"

const TONE: Record<Tone, string> = {
  success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  info: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400",
  warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  muted: "border-transparent bg-muted text-muted-foreground",
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // subscriptions
  active: { label: "Đang hoạt động", tone: "success" },
  on_trial: { label: "Dùng thử", tone: "info" },
  cancelled: { label: "Đã hủy", tone: "danger" },
  expired: { label: "Hết hạn", tone: "muted" },
  paused: { label: "Tạm dừng", tone: "warning" },
  past_due: { label: "Quá hạn", tone: "warning" },
  unpaid: { label: "Chưa thanh toán", tone: "warning" },
  // payments
  pending: { label: "Chờ thanh toán", tone: "warning" },
  paid: { label: "Đã thanh toán", tone: "success" },
  failed: { label: "Thất bại", tone: "danger" },
  // log levels
  error: { label: "Lỗi", tone: "danger" },
  warn: { label: "Cảnh báo", tone: "warning" },
  info: { label: "Thông tin", tone: "info" },
  debug: { label: "Debug", tone: "muted" },
  // entitlement types
  manual: { label: "Cấp thủ công", tone: "info" },
  subscription: { label: "Từ đăng ký", tone: "success" },
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const known = STATUS[status]
  return (
    <Badge variant="outline" className={cn(TONE[known?.tone ?? "muted"], className)}>
      {known?.label ?? status}
    </Badge>
  )
}

export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge variant="outline" className={TONE[enabled ? "success" : "danger"]}>
      {enabled ? "Đang bật" : "Đã tắt"}
    </Badge>
  )
}

export { TONE as badgeTones }
