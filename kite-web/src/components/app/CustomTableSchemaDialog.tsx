import {
  useCustomTableCreateMutation,
  useCustomTableUpdateMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import {
  CustomTable,
  CustomTableColumn,
  CustomTableCreateRequest,
} from "@/lib/types/wire.gen";
import { PlusIcon, TrashIcon } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingButton from "../common/LoadingButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const columnTypes = [
  ["text", "Text"],
  ["number", "Number"],
  ["boolean", "Boolean"],
  ["datetime", "DateTime"],
  ["json", "JSON / Array"],
] as const;

function emptyColumn(): CustomTableColumn {
  return {
    id: "",
    name: "",
    type: "text",
  };
}

function formatDefault(value: unknown) {
  if (value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value) ?? "";
}

function parseDefault(raw: string, type: string): unknown {
  if (type === "text" || type === "datetime") return raw;
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true";
  return JSON.parse(raw);
}

function columnTypeLabel(type: string) {
  return columnTypes.find(([value]) => value === type)?.[1] ?? type;
}

function schemaRisks(table: CustomTable, columns: CustomTableColumn[]) {
  const nextById = new Map(columns.filter((column) => column.id).map((column) => [column.id, column]));
  const previousById = new Map(table.schema.columns.map((column) => [column.id, column]));
  const removed = table.schema.columns.filter((column) => !nextById.has(column.id));
  const typeChanges = columns.flatMap((column) => {
    const previous = previousById.get(column.id);
    return previous && previous.type !== column.type ? [{ previous, next: column }] : [];
  });
  const constraintChanges = columns.flatMap((column) => {
    const previous = previousById.get(column.id);
    if (!previous) return [];
    const changes: string[] = [];
    if (!previous.required && column.required) changes.push("bắt buộc");
    if (!previous.unique && column.unique) changes.push("không trùng");
    return changes.length > 0 ? [{ column, changes }] : [];
  });
  return { removed, typeChanges, constraintChanges };
}

export default function CustomTableSchemaDialog({
  children,
  table,
}: {
  children: ReactNode;
  table?: CustomTable;
}) {
  const appId = useAppId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("app");
  const [columns, setColumns] = useState<CustomTableColumn[]>([emptyColumn()]);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<CustomTableCreateRequest>();
  const createMutation = useCustomTableCreateMutation(appId);
  const updateMutation = useCustomTableUpdateMutation(appId, table?.id ?? "");

  useEffect(() => {
    if (!open) return;
    setName(table?.name ?? "");
    setDescription(table?.description ?? "");
    setScope(table?.scope ?? "app");
    setColumns(
      table?.schema.columns.length
        ? table.schema.columns.map((column) => ({ ...column }))
        : [emptyColumn()]
    );
  }, [open, table]);

  function updateColumn(index: number, update: Partial<CustomTableColumn>) {
    setColumns((current) =>
      current.map((column, i) => (i === index ? { ...column, ...update } : column))
    );
  }

  function save(request: CustomTableCreateRequest) {
    const mutation = table ? updateMutation : createMutation;
    mutation.mutate(request, {
      onSuccess(response) {
        if (response.success) {
          toast.success(table ? "Đã lưu thiết kế bảng." : "Đã tạo bảng dữ liệu.");
          setOpen(false);
        } else {
          toast.error(response.error.message, { duration: 10000 });
        }
      },
    });
  }

  function submit() {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) {
      toast.error("Tên bảng phải bắt đầu bằng chữ thường và chỉ chứa a-z, 0-9, _.");
      return;
    }
    const seen = new Set<string>();
    for (const column of columns) {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(column.name)) {
        toast.error(`Tên cột "${column.name || "trống"}" không hợp lệ.`);
        return;
      }
      if (seen.has(column.name)) {
        toast.error(`Tên cột "${column.name}" bị trùng.`);
        return;
      }
      seen.add(column.name);
    }

    const request: CustomTableCreateRequest = {
      name,
      description,
      scope,
      schema: { columns },
    };
    if (table) {
      const risks = schemaRisks(table, columns);
      if (
        risks.removed.length > 0 ||
        risks.typeChanges.length > 0 ||
        risks.constraintChanges.length > 0
      ) {
        setPendingRequest(request);
        setWarningOpen(true);
        return;
      }
    }
    save(request);
  }

  const risks = table ? schemaRisks(table, columns) : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto rounded-lg sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{table ? "Thiết kế bảng" : "Tạo bảng dữ liệu"}</DialogTitle>
          <DialogDescription>
            Đặt kiểu dữ liệu rõ ràng để dashboard và flow cùng kiểm tra giá trị.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="custom-table-name">Tên bảng</Label>
              <Input
                id="custom-table-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="font-mono"
                placeholder="shop_items"
                maxLength={64}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Phạm vi</Label>
              <Select value={scope} onValueChange={setScope} disabled={Boolean(table)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="app">Toàn ứng dụng</SelectItem>
                    <SelectItem value="guild">Theo từng máy chủ</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-table-description">Mô tả</Label>
            <Textarea
              id="custom-table-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Dữ liệu vật phẩm có thể mua trong shop"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Các cột</div>
                <div className="text-sm text-muted-foreground">
                  Tên có thể đổi sau; flow luôn tham chiếu ID ổn định của cột.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColumns((current) => [...current, emptyColumn()])}
              >
                <PlusIcon data-icon="inline-start" />
                Thêm cột
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {columns.map((column, index) => (
                <div key={`${column.id}-${index}`} className="rounded-lg border p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`column-name-${index}`}>Tên cột</Label>
                      <Input
                        id={`column-name-${index}`}
                        value={column.name}
                        onChange={(event) => updateColumn(index, { name: event.target.value })}
                        className="font-mono"
                        placeholder="item_id"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Kiểu</Label>
                      <Select
                        value={column.type}
                        onValueChange={(type) =>
                          updateColumn(index, {
                            type,
                            has_default: false,
                            default_value: undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {columnTypes.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-end"
                      aria-label={`Xóa cột ${column.name}`}
                      onClick={() =>
                        setColumns((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <TrashIcon />
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(column.required)}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { required: checked === true })
                        }
                      />
                      Bắt buộc
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(column.unique)}
                        onCheckedChange={(checked) =>
                          updateColumn(index, { unique: checked === true })
                        }
                      />
                      Không trùng
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={Boolean(column.has_default)}
                        onCheckedChange={(checked) =>
                          updateColumn(index, {
                            has_default: checked,
                            default_value: checked ? "" : undefined,
                          })
                        }
                      />
                      Giá trị mặc định
                    </label>
                  </div>

                  {column.has_default && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Label htmlFor={`column-default-${index}`}>Mặc định</Label>
                      <Input
                        id={`column-default-${index}`}
                        value={formatDefault(column.default_value)}
                        onChange={(event) => {
                          try {
                            updateColumn(index, {
                              default_value: parseDefault(event.target.value, column.type),
                            });
                          } catch {
                            updateColumn(index, { default_value: event.target.value });
                          }
                        }}
                        placeholder={column.type === "json" ? "{} hoặc []" : undefined}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <LoadingButton
            type="button"
            loading={createMutation.isPending || updateMutation.isPending}
            onClick={submit}
          >
            {table ? "Lưu thay đổi" : "Tạo bảng"}
          </LoadingButton>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={warningOpen}
        onOpenChange={(next) => {
          setWarningOpen(next);
          if (!next) setPendingRequest(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kiểm tra thay đổi cấu trúc bảng</AlertDialogTitle>
            <AlertDialogDescription>
              Kite sẽ chuyển đổi toàn bộ dữ liệu trong một transaction. Nếu có một dòng
              không thể chuyển, toàn bộ thay đổi sẽ được hủy và dữ liệu cũ được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            {risks?.typeChanges.map(({ previous, next }) => (
              <div key={next.id}>
                Cột <span className="font-mono font-medium">{next.name}</span>: {" "}
                {columnTypeLabel(previous.type)} → {columnTypeLabel(next.type)}. Các giá trị
                hiện tại sẽ được cast tự động.
              </div>
            ))}
            {risks && risks.removed.length > 0 && (
              <div className="text-destructive">
                Dữ liệu của {risks.removed.length} cột bị xóa sẽ mất vĩnh viễn: {" "}
                {risks.removed.map((column) => column.name).join(", ")}.
              </div>
            )}
            {risks?.constraintChanges.map(({ column, changes }) => (
              <div key={column.id}>
                Cột <span className="font-mono font-medium">{column.name}</span> sẽ thêm ràng
                buộc {changes.join(" và ")}; dữ liệu hiện tại phải thỏa mãn trước khi lưu.
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRequest) save(pendingRequest);
              }}
            >
              Tiếp tục chuyển đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
