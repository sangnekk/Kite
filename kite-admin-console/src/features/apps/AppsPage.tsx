import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link, useNavigate } from "react-router"
import { DataTable } from "@/components/data-table/DataTable"
import { SearchInput } from "@/components/common/Filters"
import { PageHeader } from "@/components/common/PageHeader"
import { EnabledBadge } from "@/components/common/StatusBadge"
import { useAdminList } from "@/hooks/useAdminList"
import { useListState } from "@/hooks/useListState"
import { formatDate, formatNumber } from "@/lib/format"
import type { AppItem } from "@/lib/types"

const FILTERS = [] as const

export function Component() {
  const navigate = useNavigate()
  const list = useListState(FILTERS)
  const { tableProps } = useAdminList<AppItem>("apps", "/apps", list)

  const columns = useMemo<ColumnDef<AppItem>[]>(
    () => [
      {
        id: "name",
        header: "Ứng dụng",
        meta: { label: "Ứng dụng", csv: (a) => a.name },
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</div>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Chủ sở hữu",
        meta: { label: "Chủ sở hữu", csv: (a) => a.owner_email },
        cell: ({ row }) => (
          <Link
            to={`/users/${row.original.owner_id}`}
            className="underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.owner_email ?? row.original.owner_id}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Trạng thái",
        meta: { label: "Trạng thái", csv: (a) => (a.enabled ? "Đang bật" : `Đã tắt${a.disabled_reason ? `: ${a.disabled_reason}` : ""}`) },
        cell: ({ row }) => (
          <div className="space-y-1">
            <EnabledBadge enabled={row.original.enabled} />
            {!row.original.enabled && row.original.disabled_reason && (
              <div className="max-w-56 truncate text-xs text-muted-foreground" title={row.original.disabled_reason}>
                {row.original.disabled_reason}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "credits_used",
        header: "Credits đã dùng",
        meta: { label: "Credits đã dùng", className: "text-right tabular-nums" },
        cell: ({ row }) => formatNumber(row.original.credits_used),
      },
      {
        accessorKey: "collaborators_count",
        header: "Cộng tác viên",
        meta: { label: "Cộng tác viên", className: "text-right tabular-nums" },
      },
      {
        accessorKey: "created_at",
        header: "Ngày tạo",
        meta: { label: "Ngày tạo" },
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    []
  )

  return (
    <>
      <PageHeader title="Ứng dụng" description="Các bot Discord do người dùng tạo." />
      <DataTable
        {...tableProps}
        columns={columns}
        storageKey="apps"
        exportName="ung-dung"
        getRowId={(a) => a.id}
        onRowClick={(a) => navigate(a.id)}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên ứng dụng..." />}
      />
    </>
  )
}
