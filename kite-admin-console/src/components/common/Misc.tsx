import { useState, type ReactNode } from "react"
import { Check, Copy, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api"
import { formatDateTime, isLifetime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function CopyButton({ value, label = "Sao chép" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Không sao chép được")
    }
  }

  return (
    <Button variant="ghost" size="icon-xs" aria-label={label} title={label} onClick={() => void copy()}>
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}

/** A monospace id with a copy button. */
export function IdText({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{value}</code>
      <CopyButton value={value} />
    </span>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Không tải được dữ liệu</EmptyTitle>
        <EmptyDescription>{errorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

/** When a subscription ends: its end date, "Vĩnh viễn" when it never does. */
export function SubscriptionEnd({
  endsAt,
  renewsAt,
}: {
  endsAt: string | null | undefined
  renewsAt: string | null | undefined
}) {
  if (endsAt) return <DateTime value={endsAt} />
  if (isLifetime(renewsAt)) return <span className="text-muted-foreground">Vĩnh viễn</span>
  return <span className="text-muted-foreground">—</span>
}

export function DateTime({ value }: { value: string | null | undefined }) {
  return <span className="whitespace-nowrap tabular-nums">{formatDateTime(value)}</span>
}

/** A label/value row for detail panels. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
