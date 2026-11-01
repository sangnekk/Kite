import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { Gift, Trash2 } from "lucide-react"
import { atLeast, useCurrentAdmin } from "@/auth/session"
import { AppPicker } from "@/components/common/AppPicker"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { DateTime } from "@/components/common/Misc"
import { badgeTones, StatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/DataTable"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { usePlans } from "@/features/plans/api"
import { useAdminList } from "@/hooks/useAdminList"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { useListState } from "@/hooks/useListState"
import { api, errorMessage } from "@/lib/api"
import { formatDuration, grantedDays, isOverride, parseGrantDays, planDurationDays } from "@/lib/entitlement"
import type { EntitlementItem } from "@/lib/types"

const FILTERS = [] as const

function GrantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const plans = usePlans()
  const [appId, setAppId] = useState("")
  const [planId, setPlanId] = useState("")
  const [days, setDays] = useState("")
  const [error, setError] = useState<string | null>(null)

  const plan = plans.data?.find((p) => p.id === planId)
  const planDays = plan ? planDurationDays(plan) : null
  // undefined = not a valid number of days, null = permanent
  const duration = parseGrantDays(days)
  const valid = appId !== "" && planId !== "" && duration !== undefined
  const overrides = plan !== undefined && duration !== undefined && duration !== planDays

  function choosePlan(id: string) {
    setPlanId(id)
    // The duration follows the plan, so a yearly plan is never granted for a
    // month by accident. The admin can still change it afterwards.
    const chosen = plans.data?.find((p) => p.id === id)
    if (chosen) setDays(String(chosen.premium_duration_days))
  }

  const grant = useAdminMutation(
    () => api("/billing/entitlements", { method: "POST", body: { app_id: appId, plan_id: planId, duration_days: duration ?? 0 } }),
    { invalidate: [["entitlements"], ["app"]], success: "Đã cấp gói", toastError: false }
  )

  async function submit() {
    setError(null)
    try {
      await grant.mutateAsync()
      setAppId("")
      setPlanId("")
      setDays("")
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !grant.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp gói thủ công</DialogTitle>
          <DialogDescription>
            Tặng một gói cho ứng dụng mà không cần thanh toán, ví dụ để đền bù hoặc dùng thử.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ứng dụng</Label>
            <AppPicker value={appId} onChange={setAppId} className="[&>button]:w-full" />
          </div>

          <div className="space-y-2">
            <Label>Gói</Label>
            <Select value={planId} onValueChange={choosePlan}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn gói" />
              </SelectTrigger>
              <SelectContent>
                {plans.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} · {formatDuration(planDurationDays(p))}
                    {p.archived ? " (đã lưu trữ)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-days">Thời hạn cấp (ngày)</Label>
            <Input
              id="grant-days"
              inputMode="numeric"
              value={days}
              placeholder={plan ? undefined : "Chọn gói trước"}
              onChange={(e) => setDays(e.target.value)}
              aria-invalid={duration === undefined}
            />
            {duration === undefined ? (
              <p role="alert" className="text-xs text-destructive">
                Nhập số ngày nguyên từ 0 đến 36500.
              </p>
            ) : overrides ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                <span>
                  <strong>Ghi đè:</strong> gói <strong>{plan.title}</strong> quy định {formatDuration(planDays)}, bạn đang cấp {formatDuration(duration)} {" "}
                  .
                </span>
                <Button
                  variant="link"
                  size="xs"
                  className="ml-auto h-auto shrink-0 p-0"
                  onClick={() => setDays(String(plan.premium_duration_days))}
                >
                  Dùng thời hạn của gói?
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {plan ? "Theo đúng thời hạn của gói." : "Để 0 hoặc bỏ trống để cấp vĩnh viễn."}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={grant.isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={!valid || grant.isPending} onClick={() => void submit()}>
            {grant.isPending && <Spinner />}
            {valid && plan ? `Cấp ${formatDuration(duration ?? null).toLowerCase()}` : "Cấp gói"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Component() {
  const canWrite = atLeast(useCurrentAdmin().role, "admin")
  const list = useListState(FILTERS)
  const { tableProps } = useAdminList<EntitlementItem>("entitlements", "/billing/entitlements", list)
  const [granting, setGranting] = useState(false)
  const [removing, setRemoving] = useState<EntitlementItem | null>(null)
  const plans = usePlans()
  const planById = useMemo(() => new Map((plans.data ?? []).map((p) => [p.id, p])), [plans.data])

  const remove = useAdminMutation(
    (id: string) => api(`/billing/entitlements/${id}`, { method: "DELETE" }),
    { invalidate: [["entitlements"], ["app"]], success: "Đã thu hồi gói", toastError: false }
  )

  const columns = useMemo<ColumnDef<EntitlementItem>[]>(
    () => [
      {
        id: "app",
        header: "Ứng dụng",
        meta: { label: "Ứng dụng", csv: (e) => e.app_name ?? e.app_id },
        cell: ({ row }) => (
          <Link to={`/apps/${row.original.app_id}`} className="underline-offset-4 hover:underline">
            {row.original.app_name ?? row.original.app_id}
          </Link>
        ),
      },
      {
        id: "plan",
        header: "Gói",
        meta: { label: "Gói", csv: (e) => planById.get(e.plan_id)?.title ?? e.plan_id },
        cell: ({ row }) => {
          const plan = planById.get(row.original.plan_id)
          return (
            <div>
              <div className="font-medium">{plan?.title ?? row.original.plan_id}</div>
              {plan && <div className="font-mono text-xs text-muted-foreground">{plan.id}</div>}
            </div>
          )
        },
      },
      {
        accessorKey: "type",
        header: "Loại",
        meta: { label: "Loại" },
        cell: ({ row }) => <StatusBadge status={row.original.type} />,
      },
      {
        id: "granted",
        header: "Thời hạn cấp",
        meta: {
          label: "Thời hạn cấp",
          csv: (e) => formatDuration(grantedDays(e.created_at, e.ends_at)),
        },
        cell: ({ row }) => {
          const e = row.original
          const granted = grantedDays(e.created_at, e.ends_at)
          const plan = planById.get(e.plan_id)
          const planDays = plan ? planDurationDays(plan) : null
          const override = plan !== undefined && isOverride(e.type, granted, planDays)

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tabular-nums">{formatDuration(granted)}</span>
              {override && (
                <Badge
                  variant="outline"
                  className={badgeTones.warning}
                  title={`Gói ${plan.title} quy định ${formatDuration(planDays)}`}
                >
                  Ghi đè · gói: {formatDuration(planDays)}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "ends_at",
        header: "Hết hạn",
        meta: { label: "Hết hạn" },
        cell: ({ row }) =>
          row.original.ends_at ? <DateTime value={row.original.ends_at} /> : <span className="text-muted-foreground">Vĩnh viễn</span>,
      },
      {
        accessorKey: "created_at",
        header: "Ngày cấp",
        meta: { label: "Ngày cấp" },
        cell: ({ row }) => <DateTime value={row.original.created_at} />,
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-px text-right" },
              cell: ({ row }) => (
                <Button variant="ghost" size="sm" onClick={() => setRemoving(row.original)}>
                  <Trash2 /> Thu hồi
                </Button>
              ),
            } satisfies ColumnDef<EntitlementItem>,
          ]
        : []),
    ],
    [canWrite, planById]
  )

  return (
    <>
      <DataTable
        {...tableProps}
        columns={columns}
        storageKey="entitlements"
        exportName="quyen-su-dung-goi"
        getRowId={(e) => e.id}
        toolbar={
          canWrite ? (
            <Button size="sm" onClick={() => setGranting(true)}>
              <Gift /> Cấp gói thủ công
            </Button>
          ) : undefined
        }
      />

      <GrantDialog open={granting} onOpenChange={setGranting} />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Thu hồi gói này?"
        description={
          <>
            Ứng dụng <strong>{removing?.app_name ?? removing?.app_id}</strong> sẽ mất quyền lợi của gói{" "}
            <strong>{removing?.plan_id}</strong> ngay lập tức.
          </>
        }
        confirmLabel="Thu hồi"
        destructive
        onConfirm={() => remove.mutateAsync(removing!.id)}
      />
    </>
  )
}
