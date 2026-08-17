import {
  useCustomTableDeleteMutation,
  useCustomTableRowDeleteMutation,
  useCustomTableRowPatchMutation,
} from "@/lib/api/mutations";
import { useCustomTableRowsQuery } from "@/lib/api/queries";
import { useAppFeatures, useAppStateGuilds, useCustomTables } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import {
  CustomTable,
  CustomTableColumn,
  CustomTableRow,
  Guild,
} from "@/lib/types/wire.gen";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Settings2Icon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import CustomTableRowDialog, { parseCustomTableCell } from "./CustomTableRowDialog";
import CustomTableSchemaDialog from "./CustomTableSchemaDialog";
import {
  CustomTableExportDialog,
  CustomTableImportDialog,
} from "./CustomTableTransferDialog";

const pageSize = 25;

function formatCell(column: CustomTableColumn, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (column.type === "json") return JSON.stringify(value);
  if (column.type === "datetime") return new Date(String(value)).toLocaleString();
  return String(value);
}

function editorCell(column: CustomTableColumn, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (column.type === "datetime") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
  }
  if (column.type === "json") return JSON.stringify(value);
  return String(value);
}

function EditableCell({
  table,
  row,
  column,
}: {
  table: CustomTable;
  row: CustomTableRow;
  column: CustomTableColumn;
}) {
  const appId = useAppId();
  const mutation = useCustomTableRowPatchMutation(appId, table.id, row.id);
  const source = row.data[column.id];
  const [value, setValue] = useState(editorCell(column, source));

  useEffect(() => setValue(editorCell(column, source)), [column, source]);

  function save(nextValue = value) {
    let parsed: unknown;
    try {
      parsed = parseCustomTableCell(column, nextValue);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Giá trị không hợp lệ.");
      setValue(editorCell(column, source));
      return;
    }
    if (JSON.stringify(parsed) === JSON.stringify(source)) return;
    mutation.mutate(
      { fields: { [column.id]: parsed } },
      {
        onSuccess(response) {
          if (!response.success) {
            toast.error(response.error.message);
            setValue(editorCell(column, source));
          }
        },
      }
    );
  }

  if (column.type === "boolean") {
    return (
      <Checkbox
        checked={Boolean(source)}
        disabled={mutation.isPending}
        aria-label={`Sửa ${column.name}`}
        onCheckedChange={(checked) => {
          const next = checked === true;
          setValue(String(next));
          save(String(next));
        }}
      />
    );
  }

  return (
    <Input
      value={value}
      type={
        column.type === "number"
          ? "number"
          : column.type === "datetime"
            ? "datetime-local"
            : "text"
      }
      disabled={mutation.isPending}
      className="h-9 min-w-32 border-transparent bg-transparent focus-visible:border-input"
      aria-label={`Sửa ${column.name}`}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => save()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setValue(editorCell(column, source));
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function DeleteRowButton({ table, row }: { table: CustomTable; row: CustomTableRow }) {
  const mutation = useCustomTableRowDeleteMutation(useAppId(), table.id, row.id);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Xóa dòng">
          <TrashIcon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa dòng dữ liệu?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này xóa vĩnh viễn dòng <span className="font-mono">{row.id}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ lại</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(undefined, {
                onSuccess(response) {
                  if (response.success) toast.success("Đã xóa dòng dữ liệu.");
                  else toast.error(response.error.message);
                },
              })
            }
          >
            Xóa dòng
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CustomTableWorkbench() {
  const appId = useAppId();
  const rawTables = useCustomTables();
  const features = useAppFeatures();
  const tables = useMemo(
    () => (rawTables ?? []).filter((table): table is CustomTable => Boolean(table)),
    [rawTables]
  );
  const rawGuilds = useAppStateGuilds();
  const guilds = useMemo(
    () => (rawGuilds ?? []).filter((guild): guild is Guild => Boolean(guild)),
    [rawGuilds]
  );
  const [selectedId, setSelectedId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(0);
  const selected = tables.find((table) => table.id === selectedId);
  const maxTables = features?.max_custom_tables ?? 0;
  const tableLimitReached = Boolean(features) && maxTables >= 0 && tables.length >= maxTables;
  const deleteTableMutation = useCustomTableDeleteMutation(appId, selected?.id ?? "");

  useEffect(() => {
    if (!selectedId && tables.length > 0) setSelectedId(tables[0].id);
    if (selectedId && !tables.some((table) => table.id === selectedId)) {
      setSelectedId(tables[0]?.id ?? "");
    }
  }, [selectedId, tables]);

  useEffect(() => {
    setPage(0);
    setSearch("");
    if (selected?.scope === "guild") setScopeId((current) => current || guilds[0]?.id || "");
    else setScopeId("");
  }, [guilds, selected?.id, selected?.scope]);

  const rowRequest = useMemo(() => {
    const textColumns = selected?.schema.columns.filter((column) => column.type === "text") ?? [];
    return {
      scope_id: scopeId,
      filter_mode: "any",
      filters: deferredSearch
        ? textColumns.map((column) => ({
            column_id: column.id,
            operator: "contains",
            value: deferredSearch,
          }))
        : [],
      limit: pageSize,
      offset: page * pageSize,
    };
  }, [deferredSearch, page, scopeId, selected]);

  const rowsQuery = useCustomTableRowsQuery(
    appId,
    selected?.id ?? "",
    rowRequest,
    Boolean(selected) && (selected?.scope !== "guild" || Boolean(scopeId))
  );
  const rowResponse = rowsQuery.data?.success ? rowsQuery.data.data : undefined;
  const rows = (rowResponse?.rows ?? []).filter(
    (row): row is CustomTableRow => Boolean(row)
  );
  const total = rowResponse?.total_count ?? 0;
  const canNext = (page + 1) * pageSize < total;

  if (!rawTables) {
    return (
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có bảng dữ liệu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">
            Tạo schema đầu tiên để lưu inventory, shop, nhiệm vụ hoặc dữ liệu moderation.
          </p>
          <CustomTableSchemaDialog>
            <Button disabled={tableLimitReached}>
              <PlusIcon data-icon="inline-start" />
              Tạo bảng đầu tiên
            </Button>
          </CustomTableSchemaDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden rounded-lg border bg-card p-2 md:block">
        <div className="mb-2 flex items-center justify-between px-2 py-1">
          <span className="text-sm font-medium">
            Bảng {features && maxTables >= 0 ? `${tables.length}/${maxTables}` : tables.length}
          </span>
          <CustomTableSchemaDialog>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tạo bảng"
              title={tableLimitReached ? `Đã đạt giới hạn ${maxTables} bảng của gói` : undefined}
              disabled={tableLimitReached}
            >
              <PlusIcon />
            </Button>
          </CustomTableSchemaDialog>
        </div>
        <div className="flex flex-col gap-1">
          {tables.map((table) => (
            <Button
              key={table.id}
              type="button"
              variant={table.id === selectedId ? "secondary" : "ghost"}
              className="h-auto w-full justify-start px-2 py-2 text-left"
              onClick={() => setSelectedId(table.id)}
            >
              <DatabaseIcon data-icon="inline-start" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm">{table.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {table.schema.columns.length} cột · {table.scope === "guild" ? "guild" : "app"}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 md:hidden">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-mono text-xl font-semibold">{selected.name}</h2>
                  <Badge variant="secondary">
                    {selected.scope === "guild" ? "Theo máy chủ" : "Toàn ứng dụng"}
                  </Badge>
                  {features && (
                    <Badge variant="outline">
                      {maxTables === -1
                        ? `${tables.length} bảng · không giới hạn`
                        : maxTables === 0
                          ? `${tables.length} bảng · gói đã khóa`
                          : `${tables.length}/${maxTables} bảng`}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.description || "Không có mô tả"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CustomTableSchemaDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden"
                    disabled={tableLimitReached}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Bảng mới
                  </Button>
                </CustomTableSchemaDialog>
                <CustomTableSchemaDialog table={selected}>
                  <Button variant="outline" size="sm">
                    <Settings2Icon data-icon="inline-start" />
                    Schema
                  </Button>
                </CustomTableSchemaDialog>
                <CustomTableImportDialog table={selected} scopeId={scopeId}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      selected.schema.columns.length === 0 ||
                      (selected.scope === "guild" && !scopeId)
                    }
                  >
                    <UploadIcon data-icon="inline-start" />
                    Nhập
                  </Button>
                </CustomTableImportDialog>
                <CustomTableExportDialog table={selected} scopeId={scopeId}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      selected.schema.columns.length === 0 ||
                      (selected.scope === "guild" && !scopeId)
                    }
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Xuất
                  </Button>
                </CustomTableExportDialog>
                <CustomTableRowDialog table={selected} scopeId={scopeId}>
                  <Button size="sm" disabled={selected.schema.columns.length === 0}>
                    <PlusIcon data-icon="inline-start" />
                    Thêm dòng
                  </Button>
                </CustomTableRowDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Xóa bảng">
                      <TrashIcon />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa bảng {selected.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Schema và toàn bộ dữ liệu trong bảng sẽ bị xóa vĩnh viễn.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deleteTableMutation.isPending}
                        onClick={() =>
                          deleteTableMutation.mutate(undefined, {
                            onSuccess(response) {
                              if (response.success) toast.success("Đã xóa bảng dữ liệu.");
                              else toast.error(response.error.message);
                            },
                          })
                        }
                      >
                        Xóa bảng
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="mb-3 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  className="pl-9"
                  placeholder="Tìm trong các cột text..."
                />
              </div>
              {selected.scope === "guild" && (
                <Select
                  value={scopeId}
                  onValueChange={(value) => {
                    setScopeId(value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="sm:w-64">
                    <SelectValue placeholder="Chọn máy chủ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {guilds.map((guild) => (
                        <SelectItem key={guild.id} value={guild.id}>
                          {guild.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {selected.schema.columns.map((column) => (
                      <TableHead key={column.id} className="min-w-40">
                        <div className="font-mono text-xs">{column.name}</div>
                        <div className="text-[10px] font-normal">{column.type}</div>
                      </TableHead>
                    ))}
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={selected.schema.columns.length + 2}>
                          <Skeleton className="h-9" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={selected.schema.columns.length + 2}
                        className="h-28 text-center text-muted-foreground"
                      >
                        Không có dòng dữ liệu phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {page * pageSize + rowIndex + 1}
                        </TableCell>
                        {selected.schema.columns.map((column) => (
                          <TableCell key={column.id} className="p-1">
                            <EditableCell table={selected} row={row} column={column} />
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          <DeleteRowButton table={selected} row={row} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {rows.map((row) => (
                <Card key={row.id}>
                  <CardContent className="flex flex-col gap-3 pt-5">
                    {selected.schema.columns.map((column) => (
                      <div key={column.id} className="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                        <span className="truncate font-mono text-muted-foreground">
                          {column.name}
                        </span>
                        <span className="break-words text-right">
                          {formatCell(column, row.data[column.id]) || "—"}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-end gap-2">
                      <CustomTableRowDialog
                        table={selected}
                        row={row}
                        scopeId={scopeId}
                      >
                        <Button variant="outline" size="sm">
                          <PencilIcon data-icon="inline-start" />
                          Sửa
                        </Button>
                      </CustomTableRowDialog>
                      <DeleteRowButton table={selected} row={row} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!rowsQuery.isLoading && rows.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Không có dòng dữ liệu phù hợp.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Hiển thị {rows.length} trên tổng {total} dòng
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Sau
                  <ChevronRightIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
