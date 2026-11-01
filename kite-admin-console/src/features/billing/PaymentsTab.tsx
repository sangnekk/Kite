import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { CircleCheck, CircleX } from "lucide-react"
import { atLeast, useCurrentAdmin } from "@/auth/session"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { FilterSelect } from "@/components/common/Filters"
import { DateTime } from "@/components/common/Misc"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable } from "@/components/data-table/DataTable"
import { Button } from "@/components/ui/button"
import { useAdminList } from "@/hooks/useAdminList"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { useListState } from "@/hooks/useListState"
import { api } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import type { PaymentSessionItem } from "@/lib/types"

const FILTERS = ["status"] as const

const STATUSES = [
  { value: "pending", label: "Chờ thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "failed", label: "Thất bại" },
  { value: "expired", label: "Hết hạn" },
]

type Action = { session: PaymentSessionItem; status: "paid" | "failed" }

export function Component() {
  const canWrite = atLeast(useCurrentAdmin().role, "admin")
  const list = useListState(FILTERS)
  const { tableProps } = useAdminList<PaymentSessionItem>("payments", "/billing/payment-sessions", list)
  const [action, setAction] = useState<Action | null>(null)

  const settle = useAdminMutation(
    ({ session, status }: Action) =>
      api(`/billing/payment-sessions/${session.id}`, { method: "PATCH", body: { status } }),
    {
      invalidate: [["payments"], ["entitlements"], ["subscriptions"], ["revenue"], ["dashboard"]],
      success: (_, { status }) => (status === "paid" ? "Đã xác nhận thanh toán và cấp gói" : "Đã hủy giao dịch"),
      toastError: false,
    }
  )

  const columns = useMemo<ColumnDef<PaymentSessionItem>[]>(
    () => [
      {
        accessorKey: "payment_id",
        header: "Mã giao dịch",
        meta: { label: "Mã giao dịch" },
        cell: ({ row }) => <code className="font-mono text-xs">{row.original.payment_id}</code>,
      },
      {
        id: "app",
        header: "Ứng dụng",
        meta: { label: "Ứng dụng", csv: (p) => p.app_name ?? p.app_id },
        cell: ({ row }) => (
          <Link to={`/apps/${row.original.app_id}`} className="underline-offset-4 hover:underline">
            {row.original.app_name ?? row.original.app_id}
          </Link>
        ),
      },
      { accessorKey: "plan_id", header: "Gói", meta: { label: "Gói" } },
      {
        accessorKey: "amount",
        header: "Số tiền",
        meta: { label: "Số tiền", className: "text-right tabular-nums" },
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        meta: { label: "Trạng thái" },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paid_at",
        header: "Thanh toán lúc",
        meta: { label: "Thanh toán lúc" },
        cell: ({ row }) => <DateTime value={row.original.paid_at} />,
      },
      {
        accessorKey: "created_at",
        header: "Tạo lúc",
        meta: { label: "Tạo lúc" },
        cell: ({ row }) => <DateTime value={row.original.created_at} />,
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-px whitespace-nowrap text-right" },
              cell: ({ row }) =>
                row.original.status === "pending" ? (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setAction({ session: row.original, status: "paid" })}>
                      <CircleCheck /> Đã nhận tiền
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAction({ session: row.original, status: "failed" })}>
                      <CircleX /> Hủy
                    </Button>
                  </div>
                ) : null,
            } satisfies ColumnDef<PaymentSessionItem>,
          ]
        : []),
    ],
    [canWrite]
  )

  const target = action?.session

  return (
    <>
      <DataTable
        {...tableProps}
        columns={columns}
        storageKey="payments"
        exportName="giao-dich"
        getRowId={(p) => p.id}
        toolbar={
          <FilterSelect
            value={list.filters.status}
            onChange={(v) => list.setFilter("status", v)}
            options={STATUSES}
            allLabel="Mọi trạng thái"
          />
        }
      />

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={action?.status === "paid" ? "Xác nhận đã nhận tiền?" : "Hủy giao dịch này?"}
        description={
          action?.status === "paid" ? (
            <>
              Hệ thống sẽ cấp gói <strong>{target?.plan_id}</strong> cho ứng dụng{" "}
              <strong>{target?.app_name ?? target?.app_id}</strong>, giống như khi ngân hàng báo tiền về. Chỉ làm vậy khi
              bạn đã kiểm tra khoản <strong>{target && formatMoney(target.amount)}</strong> thực sự vào tài khoản.
            </>
          ) : (
            <>
              Giao dịch <code className="font-mono">{target?.payment_id}</code> sẽ chuyển sang thất bại và mã QR không còn
              giá trị.
            </>
          )
        }
        confirmLabel={action?.status === "paid" ? "Đã nhận tiền, cấp gói" : "Hủy giao dịch"}
        destructive={action?.status === "failed"}
        onConfirm={() => settle.mutateAsync(action!)}
      />
    </>
  )
}
