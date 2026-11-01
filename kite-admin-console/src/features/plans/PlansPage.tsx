import { useMemo, useState } from "react"
import { ArchiveRestore, ArrowDown, ArrowUp, Archive, Pencil, Plus } from "lucide-react"
import { Can, useCan } from "@/auth/session"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { badgeTones } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api } from "@/lib/api"
import { formatLimit, formatMoney } from "@/lib/format"
import type { Plan } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PLANS_KEY, usePlans } from "./api"
import { PlanFormSheet } from "./PlanForm"

function PlanBadges({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-wrap gap-1">
      {plan.default && <Badge className="border-transparent bg-primary/15 text-primary">Mặc định</Badge>}
      {plan.popular && <Badge variant="outline" className={badgeTones.info}>Nổi bật</Badge>}
      {plan.hidden && <Badge variant="outline" className={badgeTones.muted}>Ẩn</Badge>}
      {plan.archived && <Badge variant="outline" className={badgeTones.warning}>Đã lưu trữ</Badge>}
    </div>
  )
}

export function Component() {
  const plans = usePlans()
  const canWrite = useCan("admin")
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [archiving, setArchiving] = useState<Plan | null>(null)

  const visible = useMemo(
    () => (plans.data ?? []).filter((p) => showArchived || !p.archived),
    [plans.data, showArchived]
  )
  const archivedCount = (plans.data ?? []).filter((p) => p.archived).length

  const reorder = useAdminMutation(
    (ids: string[]) => api<Plan[]>("/plans/order", { method: "PUT", body: { ids } }),
    { invalidate: [PLANS_KEY] }
  )

  const archive = useAdminMutation(
    (plan: Plan) => api<Plan>(`/plans/${plan.id}/archive`, { method: "POST" }),
    { invalidate: [PLANS_KEY], success: "Đã lưu trữ gói", toastError: false }
  )
  const restore = useAdminMutation(
    (plan: Plan) => api<Plan>(`/plans/${plan.id}/restore`, { method: "POST" }),
    { invalidate: [PLANS_KEY], success: "Đã khôi phục gói" }
  )

  function move(index: number, delta: -1 | 1) {
    const ids = visible.map((p) => p.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <>
      <PageHeader
        title="Gói đăng ký"
        description="Giá và giới hạn của từng gói. Thay đổi áp dụng ngay, không cần khởi động lại."
        actions={
          <>
            {archivedCount > 0 && (
              <div className="flex items-center gap-2">
                <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
                <Label htmlFor="show-archived" className="text-sm font-normal">
                  Hiện gói đã lưu trữ ({archivedCount})
                </Label>
              </div>
            )}
            <Can role="admin">
              <Button onClick={() => setCreating(true)}>
                <Plus /> Thêm gói
              </Button>
            </Can>
          </>
        }
      />

      {plans.error ? (
        <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {canWrite && <TableHead className="w-20" />}
                <TableHead>Gói</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead>Thời hạn</TableHead>
                <TableHead className="text-right">Lệnh</TableHead>
                <TableHead className="text-right">Biến</TableHead>
                <TableHead className="text-right">Tin nhắn</TableHead>
                <TableHead className="text-right">Credits/tháng</TableHead>
                <TableHead>AI</TableHead>
                {canWrite && <TableHead className="w-px" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.isPending
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell colSpan={canWrite ? 10 : 8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : visible.map((plan, index) => (
                    <TableRow key={plan.id} className={cn(plan.archived && "opacity-60")}>
                      {canWrite && (
                        <TableCell>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Chuyển lên"
                              disabled={index === 0 || reorder.isPending}
                              onClick={() => move(index, -1)}
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Chuyển xuống"
                              disabled={index === visible.length - 1 || reorder.isPending}
                              onClick={() => move(index, 1)}
                            >
                              <ArrowDown />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{plan.title}</div>
                          <div className="font-mono text-xs text-muted-foreground">{plan.id}</div>
                          <PlanBadges plan={plan} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {plan.price === 0 ? "Miễn phí" : formatMoney(plan.price)}
                      </TableCell>
                      <TableCell>{plan.premium_duration_days === 0 ? "Vĩnh viễn" : `${plan.premium_duration_days} ngày`}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLimit(plan.feature_max_commands)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLimit(plan.feature_max_variables)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLimit(plan.feature_max_messages)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLimit(plan.feature_usage_credits_per_month)}</TableCell>
                      <TableCell>{plan.feature_ai_included ? `${plan.feature_ai_credit_per_day}/ngày` : "—"}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(plan)}>
                              <Pencil /> Sửa
                            </Button>
                            {plan.archived ? (
                              <Button variant="ghost" size="sm" onClick={() => restore.mutate(plan)}>
                                <ArchiveRestore /> Khôi phục
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={plan.default}
                                title={plan.default ? "Không thể lưu trữ gói mặc định" : undefined}
                                onClick={() => setArchiving(plan)}
                              >
                                <Archive /> Lưu trữ
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanFormSheet
        open={creating || editing !== null}
        plan={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />

      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Lưu trữ gói “${archiving?.title}”?`}
        description="Gói sẽ không bán được nữa và biến mất khỏi trang giá. Các ứng dụng đang dùng gói này vẫn giữ nguyên quyền lợi cho tới khi hết hạn. Bạn có thể khôi phục bất cứ lúc nào."
        confirmLabel="Lưu trữ"
        onConfirm={() => archive.mutateAsync(archiving!)}
      />
    </>
  )
}
