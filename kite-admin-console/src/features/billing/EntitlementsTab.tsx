import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { Gift, Trash2 } from "lucide-react"
import { atLeast, useCurrentAdmin } from "@/auth/session"
import { AppPicker } from "@/components/common/AppPicker"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { DateTime } from "@/components/common/Misc"
import { StatusBadge } from "@/components/common/StatusBadge"
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
import type { EntitlementItem } from "@/lib/types"

const FILTERS = [] as const

function GrantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const plans = usePlans()
  const [appId, setAppId] = useState("")
  const [planId, setPlanId] = useState("")
  const [days, setDays] = useState("30")
  const [error, setError] = useState<string | null>(null)

  const duration = days.trim() === "" ? 0 : Number(days)
  const durationValid = Number.isInteger(duration) && duration >= 0 && duration <= 36500
  const valid = appId !== "" && planId !== "" && durationValid

  const grant = useAdminMutation(
    () => api("/billing/entitlements", { method: "POST", body: { app_id: appId, plan_id: planId, duration_days: duration } }),
    { invalidate: [["entitlements"], ["app"]], success: "Đã cấp gói", toastError: false }
  )

  async function submit() {
    setError(null)
    try {
      await grant.mutateAsync()
      setAppId("")
      setPlanId("")
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
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn gói" />
              </SelectTrigger>
              <SelectContent>
                {plans.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                    {p.archived ? " (đã lưu trữ)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-days">Thời hạn (ngày)</Label>
            <Input
              id="grant-days"
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              aria-invalid={!durationValid}
            />
            <p className="text-xs text-muted-foreground">Để 0 hoặc bỏ trống để cấp vĩnh viễn.</p>
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
            Cấp gói
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
      { accessorKey: "plan_id", header: "Gói", meta: { label: "Gói" } },
      {
        accessorKey: "type",
        header: "Loại",
        meta: { label: "Loại" },
        cell: ({ row }) => <StatusBadge status={row.original.type} />,
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
    [canWrite]
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
