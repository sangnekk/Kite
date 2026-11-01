import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate } from "react-router"
import { DataTable } from "@/components/data-table/DataTable"
import { SearchInput } from "@/components/common/Filters"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { useAdminList } from "@/hooks/useAdminList"
import { useListState } from "@/hooks/useListState"
import { formatDate } from "@/lib/format"
import type { UserItem } from "@/lib/types"
import { UserCell } from "./UserCell"

const FILTERS = [] as const

export function UserPlanBadge({ plan }: { plan: string }) {
  return plan === "free" ? (
    <Badge variant="secondary">Miễn phí</Badge>
  ) : (
    <Badge variant="outline" className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
      {plan}
    </Badge>
  )
}

export function Component() {
  const navigate = useNavigate()
  const list = useListState(FILTERS)
  const { tableProps } = useAdminList<UserItem>("users", "/users", list)

  const columns = useMemo<ColumnDef<UserItem>[]>(
    () => [
      {
        id: "user",
        header: "Người dùng",
        meta: { label: "Người dùng", csv: (u) => u.display_name },
        cell: ({ row }) => <UserCell user={row.original} />,
      },
      { accessorKey: "email", header: "Email", meta: { label: "Email" } },
      {
        accessorKey: "discord_username",
        header: "Discord",
        meta: { label: "Discord" },
        cell: ({ row }) => <span className="text-muted-foreground">@{row.original.discord_username}</span>,
      },
      {
        accessorKey: "plan",
        header: "Gói",
        meta: { label: "Gói" },
        cell: ({ row }) => <UserPlanBadge plan={row.original.plan} />,
      },
      {
        accessorKey: "apps_count",
        header: "Ứng dụng",
        meta: { label: "Ứng dụng", className: "text-right tabular-nums" },
      },
      {
        accessorKey: "created_at",
        header: "Ngày tham gia",
        meta: { label: "Ngày tham gia" },
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    []
  )

  return (
    <>
      <PageHeader title="Người dùng" description="Tài khoản đã đăng nhập vào Vibe Bot bằng Discord." />
      <DataTable
        {...tableProps}
        columns={columns}
        storageKey="users"
        exportName="nguoi-dung"
        getRowId={(u) => u.id}
        onRowClick={(u) => navigate(u.id)}
        toolbar={
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo email hoặc tên Discord..." />
        }
      />
    </>
  )
}
