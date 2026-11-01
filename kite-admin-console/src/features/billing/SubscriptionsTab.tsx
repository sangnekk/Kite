import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { Ban } from "lucide-react"
import { useCurrentAdmin, atLeast } from "@/auth/session"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { FilterSelect, SearchInput } from "@/components/common/Filters"
import { DateTime, SubscriptionEnd } from "@/components/common/Misc"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable } from "@/components/data-table/DataTable"
import { Button } from "@/components/ui/button"
import { useAdminList } from "@/hooks/useAdminList"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { useListState } from "@/hooks/useListState"
import { api } from "@/lib/api"
import { isLifetime } from "@/lib/format"
import type { SubscriptionItem } from "@/lib/types"

const FILTERS = ["status"] as const

const STATUSES = [
  { value: "active", label: "Đang hoạt động" },
  { value: "on_trial", label: "Dùng thử" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "expired", label: "Hết hạn" },
  { value: "paused", label: "Tạm dừng" },
]

export function Component() {
  const canWrite = atLeast(useCurrentAdmin().role, "admin")
  const list = useListState(FILTERS)
  const { tableProps } = useAdminList<SubscriptionItem>("subscriptions", "/billing/subscriptions", list)
  const [cancelling, setCancelling] = useState<SubscriptionItem | null>(null)

  const cancel = useAdminMutation(
    (id: string) => api(`/billing/subscriptions/${id}/cancel`, { method: "POST" }),
    {
      invalidate: [["subscriptions"], ["entitlements"], ["user"], ["revenue"]],
      success: "Đã hủy đăng ký",
      toastError: false,
    }
  )

  const columns = useMemo<ColumnDef<SubscriptionItem>[]>(
    () => [
      {
        id: "user",
        header: "Người dùng",
        meta: { label: "Người dùng", csv: (s) => s.user_email },
        cell: ({ row }) => (
          <Link to={`/users/${row.original.user_id}`} className="underline-offset-4 hover:underline">
            {row.original.user_email ?? row.original.user_id}
          </Link>
        ),
      },
      { accessorKey: "display_name", header: "Gói", meta: { label: "Gói" } },
      { accessorKey: "source", header: "Nguồn", meta: { label: "Nguồn" } },
      {
        accessorKey: "status",
        header: "Trạng thái",
        meta: { label: "Trạng thái" },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      // A payment buys a fixed time and never renews by itself, so there is no
      // separate "renews" date: the end date is the one that matters.
      {
        accessorKey: "ends_at",
        header: "Kết thúc",
        meta: {
          label: "Kết thúc",
          csv: (s) => s.ends_at ?? (isLifetime(s.renews_at) ? "Vĩnh viễn" : ""),
        },
        cell: ({ row }) => <SubscriptionEnd endsAt={row.original.ends_at} renewsAt={row.original.renews_at} />,
      },
      {
        accessorKey: "created_at",
        header: "Ngày tạo",
        meta: { label: "Ngày tạo" },
        cell: ({ row }) => <DateTime value={row.original.created_at} />,
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-px text-right" },
              cell: ({ row }) =>
                ["active", "on_trial"].includes(row.original.status) ? (
                  <Button variant="ghost" size="sm" onClick={() => setCancelling(row.original)}>
                    <Ban /> Hủy
                  </Button>
                ) : null,
            } satisfies ColumnDef<SubscriptionItem>,
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
        storageKey="subscriptions"
        exportName="dang-ky"
        getRowId={(s) => s.id}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo email..." />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter("status", v)}
              options={STATUSES}
              allLabel="Mọi trạng thái"
            />
          </>
        }
      />

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Hủy đăng ký này?"
        description={
          <>
            Đăng ký <strong>{cancelling?.display_name}</strong> của {cancelling?.user_email ?? cancelling?.user_id} sẽ bị
            hủy và các ứng dụng đang dùng gói này <strong>mất quyền lợi ngay lập tức</strong>.
          </>
        }
        confirmLabel="Hủy đăng ký"
        destructive
        onConfirm={() => cancel.mutateAsync(cancelling!.id)}
      />
    </>
  )
}
