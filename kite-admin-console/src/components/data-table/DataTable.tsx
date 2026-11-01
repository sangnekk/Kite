import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Download,
  RefreshCw,
  SearchX,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ErrorState } from "@/components/common/Misc"
import { errorMessage } from "@/lib/api"
import { downloadCsv, toCsv, type CsvValue } from "@/lib/csv"
import { formatNumber } from "@/lib/format"
import { PAGE_SIZES } from "@/lib/listParams"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Column title used in the column picker and the CSV header. */
    label?: string
    /** Text of the cell in the CSV export. Columns without it (and without an accessor) are not exported. */
    csv?: (row: TData) => CsvValue
    className?: string
  }
}

interface DataTableProps<TData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  data: TData[] | undefined
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  isLoading: boolean
  isFetching: boolean
  error: unknown
  onRefresh: () => void
  /** Search box and filters, shown on the left of the toolbar. */
  toolbar?: ReactNode
  /** Enables the CSV export; it is also the file name. */
  exportName?: string
  /** Loads every row that matches the filters, for "export all". */
  exportAll?: () => Promise<{ items: TData[]; truncated: boolean }>
  onRowClick?: (row: TData) => void
  getRowId?: (row: TData) => string
  /** Remembers the visible columns in this browser. */
  storageKey?: string
  /** Shown when nothing matches; `filtered` tells whether filters are active. */
  emptyTitle?: string
  filtered?: boolean
  onResetFilters?: () => void
}

function loadVisibility(key?: string): VisibilityState {
  if (!key) return {}
  try {
    return JSON.parse(localStorage.getItem(`table:${key}`) ?? "{}") as VisibilityState
  } catch {
    return {}
  }
}

export function DataTable<TData>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isFetching,
  error,
  onRefresh,
  toolbar,
  exportName,
  exportAll,
  onRowClick,
  getRowId,
  storageKey,
  emptyTitle = "Không có dữ liệu",
  filtered = false,
  onResetFilters,
}: DataTableProps<TData>) {
  const [visibility, setVisibility] = useState<VisibilityState>(() => loadVisibility(storageKey))
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(`table:${storageKey}`, JSON.stringify(visibility))
    } catch {
      // Private mode: the choice just does not persist.
    }
  }, [storageKey, visibility])

  const rows = useMemo(() => data ?? [], [data])
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
    pageCount,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
  })

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, (page - 1) * pageSize + rows.length)

  function exportRows(items: TData[], suffix: string) {
    const exportable = table
      .getVisibleLeafColumns()
      .filter((c) => c.columnDef.meta?.csv || "accessorKey" in c.columnDef)

    const header = exportable.map((c) => c.columnDef.meta?.label ?? (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id))
    const body = items.map((row) =>
      exportable.map((c) => {
        const custom = c.columnDef.meta?.csv
        if (custom) return custom(row)
        const key = (c.columnDef as { accessorKey?: string }).accessorKey
        return key ? ((row as Record<string, unknown>)[key] as CsvValue) : ""
      })
    )

    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`${exportName}-${suffix}-${stamp}.csv`, toCsv(header, body))
  }

  async function handleExportAll() {
    if (!exportAll) return
    setExporting(true)
    try {
      const { items, truncated } = await exportAll()
      exportRows(items, "tat-ca")
      if (truncated) toast.warning("Chỉ xuất 5.000 dòng đầu tiên. Hãy thu hẹp bộ lọc để xuất phần còn lại.")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && (c.columnDef.meta?.label || typeof c.columnDef.header === "string"))
  const showSkeleton = isLoading && !data
  const columnCount = table.getVisibleLeafColumns().length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Tải lại" title="Tải lại" onClick={onRefresh}>
            <RefreshCw className={cn(isFetching && "animate-spin")} />
          </Button>

          {hideable.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 /> Cột
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideable.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  >
                    {c.columnDef.meta?.label ?? (c.columnDef.header as string)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {exportName && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting || rows.length === 0}>
                  <Download /> Xuất CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportRows(rows, `trang-${page}`)}>
                  Trang hiện tại ({rows.length} dòng)
                </DropdownMenuItem>
                {exportAll && (
                  <DropdownMenuItem onSelect={() => void handleExportAll()}>
                    Tất cả kết quả đang lọc ({formatNumber(total)} dòng)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : (
        <div className={cn("overflow-hidden rounded-lg border bg-card transition-opacity", isFetching && !showSkeleton && "opacity-70")}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                Array.from({ length: Math.min(pageSize, 8) }, (_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {Array.from({ length: columnCount }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columnCount} className="p-0">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchX />
                        </EmptyMedia>
                        <EmptyTitle>{filtered ? "Không có kết quả phù hợp" : emptyTitle}</EmptyTitle>
                        {filtered && (
                          <EmptyDescription>
                            Thử đổi từ khóa hoặc{" "}
                            {onResetFilters ? (
                              <button type="button" className="underline underline-offset-4" onClick={onResetFilters}>
                                xóa bộ lọc
                              </button>
                            ) : (
                              "xóa bộ lọc"
                            )}
                            .
                          </EmptyDescription>
                        )}
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(onRowClick && "cursor-pointer")}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row.original)
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!!error && !!data && <p className="text-sm text-destructive">Làm mới dữ liệu thất bại: {errorMessage(error)}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>{total === 0 ? "0 kết quả" : `${formatNumber(from)}–${formatNumber(to)} / ${formatNumber(total)}`}</div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Số dòng</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" className="w-[4.5rem]" aria-label="Số dòng mỗi trang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-2 tabular-nums">
              Trang {formatNumber(page)} / {formatNumber(pageCount)}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Trang đầu" disabled={page <= 1} onClick={() => onPageChange(1)}>
              <ChevronsLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Trang sau" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
              <ChevronRight />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Trang cuối" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)}>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
