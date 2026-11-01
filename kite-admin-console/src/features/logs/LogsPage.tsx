import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router"
import { AppPicker } from "@/components/common/AppPicker"
import { FilterSelect, SearchInput } from "@/components/common/Filters"
import { DateTime, IdText } from "@/components/common/Misc"
import { PageHeader } from "@/components/common/PageHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable } from "@/components/data-table/DataTable"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useAdminList } from "@/hooks/useAdminList"
import { useListState } from "@/hooks/useListState"
import type { LogItem } from "@/lib/types"

const FILTERS = ["level", "app_id"] as const

const LEVELS = [
  { value: "error", label: "Lỗi" },
  { value: "warn", label: "Cảnh báo" },
  { value: "info", label: "Thông tin" },
  { value: "debug", label: "Debug" },
]

function LogDetail({ log, onClose }: { log: LogItem | null; onClose: () => void }) {
  return (
    <Sheet open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Nhật ký #{log.id} <StatusBadge status={log.level} />
              </SheetTitle>
              <SheetDescription>
                <DateTime value={log.created_at} />
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs break-words whitespace-pre-wrap">
                {log.message}
              </pre>

              <dl className="divide-y text-sm">
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-muted-foreground">Ứng dụng</dt>
                  <dd>
                    <Link to={`/apps/${log.app_id}`} className="underline-offset-4 hover:underline">
                      {log.app_name ?? log.app_id}
                    </Link>
                  </dd>
                </div>
                {(
                  [
                    ["Command", log.command_id],
                    ["Event listener", log.event_listener_id],
                    ["Message", log.message_id],
                  ] as const
                ).map(
                  ([label, id]) =>
                    id && (
                      <div key={label} className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd>
                          <IdText value={id} />
                        </dd>
                      </div>
                    )
                )}
              </dl>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function Component() {
  const list = useListState(FILTERS, 50)
  const { tableProps } = useAdminList<LogItem>("logs", "/logs", list)
  const [selected, setSelected] = useState<LogItem | null>(null)

  const columns = useMemo<ColumnDef<LogItem>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Thời gian",
        meta: { label: "Thời gian" },
        cell: ({ row }) => <DateTime value={row.original.created_at} />,
      },
      {
        accessorKey: "level",
        header: "Mức",
        meta: { label: "Mức" },
        cell: ({ row }) => <StatusBadge status={row.original.level} />,
      },
      {
        id: "app",
        header: "Ứng dụng",
        meta: { label: "Ứng dụng", csv: (l) => l.app_name ?? l.app_id },
        cell: ({ row }) => (
          <Link
            to={`/apps/${row.original.app_id}`}
            className="underline-offset-4 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.app_name ?? row.original.app_id}
          </Link>
        ),
      },
      {
        accessorKey: "message",
        header: "Nội dung",
        meta: { label: "Nội dung", className: "max-w-xl" },
        cell: ({ row }) => <div className="truncate" title={row.original.message}>{row.original.message}</div>,
      },
    ],
    []
  )

  return (
    <>
      <PageHeader title="Nhật ký" description="Nhật ký chạy của tất cả bot, mới nhất ở trên." />
      <DataTable
        {...tableProps}
        columns={columns}
        storageKey="logs"
        exportName="nhat-ky"
        getRowId={(l) => String(l.id)}
        onRowClick={setSelected}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm trong nội dung..." />
            <FilterSelect
              value={list.filters.level}
              onChange={(v) => list.setFilter("level", v)}
              options={LEVELS}
              allLabel="Mọi mức"
              className="w-36"
            />
            <AppPicker
              value={list.filters.app_id}
              onChange={(id) => list.setFilter("app_id", id)}
              placeholder="Mọi ứng dụng"
              clearable
            />
          </>
        }
      />
      <LogDetail log={selected} onClose={() => setSelected(null)} />
    </>
  )
}
