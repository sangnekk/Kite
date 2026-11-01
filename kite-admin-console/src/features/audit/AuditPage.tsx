import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { DateTime, ErrorState } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { AuditEntry } from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

const ACTIONS: Record<string, string> = {
  "user.force_logout": "Đăng xuất người dùng",
  "app.update": "Bật/tắt ứng dụng",
  "app.kill_flows": "Dừng luồng đang chờ",
  "subscription.cancel": "Hủy đăng ký",
  "entitlement.grant": "Cấp gói thủ công",
  "entitlement.delete": "Thu hồi gói",
  "payment_session.update": "Xử lý giao dịch",
  "plan.create": "Tạo gói",
  "plan.update": "Sửa gói",
  "plan.archive": "Lưu trữ gói",
  "plan.restore": "Khôi phục gói",
  "plan.reorder": "Sắp xếp gói",
  "settings.update": "Đổi cài đặt",
  "staff.add": "Thêm nhân sự",
  "staff.update": "Đổi vai trò nhân sự",
  "staff.remove": "Xóa nhân sự",
}

export function Component() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get("page")) || 1)

  const log = useQuery({
    queryKey: ["audit", page],
    queryFn: ({ signal }) => api<AuditEntry[]>("/audit-log", { params: { page, page_size: PAGE_SIZE }, signal }),
    placeholderData: keepPreviousData,
  })

  const goTo = (next: number) => setParams(next <= 1 ? {} : { page: String(next) }, { replace: true })
  const entries = log.data ?? []

  return (
    <>
      <PageHeader
        title="Nhật ký hành động"
        description="Ai đã làm gì trong trang quản trị. Giá trị bí mật không bao giờ được ghi lại."
        actions={
          <Button variant="outline" size="icon-sm" aria-label="Tải lại" onClick={() => void log.refetch()}>
            <RefreshCw className={cn(log.isFetching && "animate-spin")} />
          </Button>
        }
      />

      {log.error && !log.data ? (
        <ErrorState error={log.error} onRetry={() => void log.refetch()} />
      ) : (
        <div className={cn("overflow-hidden rounded-lg border bg-card", log.isFetching && !log.isPending && "opacity-70")}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.isPending ? (
                Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Chưa có hành động nào được ghi lại.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <DateTime value={e.created_at} />
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs">{e.actor_discord_id}</code>
                    </TableCell>
                    <TableCell>
                      <div>{ACTIONS[e.action] ?? e.action}</div>
                      <div className="font-mono text-xs text-muted-foreground">{e.action}</div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs" title={e.target}>
                      {e.target || "—"}
                    </TableCell>
                    <TableCell className="max-w-sm">
                      {e.detail ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">Xem</summary>
                          <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs break-words whitespace-pre-wrap">
                            {JSON.stringify(e.detail, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <span className="mr-2 tabular-nums">Trang {page}</span>
        <Button variant="outline" size="icon-sm" aria-label="Trang trước" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Trang sau"
          disabled={entries.length < PAGE_SIZE}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </>
  )
}
