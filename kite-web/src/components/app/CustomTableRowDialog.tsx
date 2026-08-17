import {
  useCustomTableRowInsertMutation,
  useCustomTableRowPatchMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { CustomTable, CustomTableColumn, CustomTableRow } from "@/lib/types/wire.gen";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingButton from "../common/LoadingButton";
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
import { Textarea } from "../ui/textarea";

function toEditorValue(column: CustomTableColumn, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (column.type === "datetime") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 16);
  }
  if (column.type === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

export function parseCustomTableCell(column: CustomTableColumn, raw: string): unknown {
  if (raw === "" && column.type !== "text") return null;
  switch (column.type) {
    case "number": {
      const number = Number(raw);
      if (!Number.isFinite(number)) throw new Error(`${column.name} phải là số.`);
      return number;
    }
    case "boolean":
      return raw === "true";
    case "datetime": {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) throw new Error(`${column.name} không phải thời gian hợp lệ.`);
      return date.toISOString();
    }
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`${column.name} không phải JSON hợp lệ.`);
      }
    default:
      return raw;
  }
}

export default function CustomTableRowDialog({
  children,
  table,
  row,
  scopeId,
}: {
  children: ReactNode;
  table: CustomTable;
  row?: CustomTableRow;
  scopeId: string;
}) {
  const appId = useAppId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const insertMutation = useCustomTableRowInsertMutation(appId, table.id);
  const patchMutation = useCustomTableRowPatchMutation(appId, table.id, row?.id ?? "");

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const column of table.schema.columns) {
      const value = row?.data[column.id];
      next[column.id] =
        !row && value === undefined && column.type === "boolean" && !column.has_default
          ? "false"
          : toEditorValue(column, value);
    }
    setValues(next);
  }, [open, row, table]);

  function submit() {
    const fields: Record<string, unknown> = {};
    try {
      for (const column of table.schema.columns) {
        const raw = values[column.id] ?? "";
        if (!row && raw === "" && !column.required && !column.has_default) continue;
        if (!row && raw === "" && column.has_default) continue;
        fields[column.id] = parseCustomTableCell(column, raw);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Giá trị không hợp lệ.");
      return;
    }

    const mutation = row ? patchMutation : insertMutation;
    mutation.mutate(
      row ? { fields } : { scope_id: scopeId, fields },
      {
        onSuccess(response) {
          if (response.success) {
            toast.success(row ? "Đã cập nhật dòng." : "Đã thêm dòng dữ liệu.");
            setOpen(false);
          } else {
            toast.error(response.error.message);
          }
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto rounded-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{row ? "Chỉnh sửa dòng" : "Thêm dòng dữ liệu"}</DialogTitle>
          <DialogDescription>
            Giá trị được kiểm tra theo schema trước khi lưu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {table.schema.columns.map((column) => (
            <div key={column.id} className="flex flex-col gap-2">
              <Label htmlFor={`row-${row?.id ?? "new"}-${column.id}`}>
                <span className="font-mono">{column.name}</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {column.type}
                  {column.required ? " · bắt buộc" : ""}
                </span>
              </Label>
              {column.type === "boolean" ? (
                <Select
                  value={values[column.id] || "false"}
                  onValueChange={(value) =>
                    setValues((current) => ({ ...current, [column.id]: value }))
                  }
                >
                  <SelectTrigger id={`row-${row?.id ?? "new"}-${column.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="true">Đúng</SelectItem>
                      <SelectItem value="false">Sai</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : column.type === "json" ? (
                <Textarea
                  id={`row-${row?.id ?? "new"}-${column.id}`}
                  value={values[column.id] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [column.id]: event.target.value,
                    }))
                  }
                  className="min-h-28 font-mono"
                  placeholder="{} hoặc []"
                />
              ) : (
                <Input
                  id={`row-${row?.id ?? "new"}-${column.id}`}
                  type={
                    column.type === "number"
                      ? "number"
                      : column.type === "datetime"
                        ? "datetime-local"
                        : "text"
                  }
                  value={values[column.id] || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [column.id]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
          {table.schema.columns.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Bảng chưa có cột. Hãy thiết kế schema trước khi thêm dữ liệu.
            </div>
          )}
        </div>
        <DialogFooter>
          <LoadingButton
            type="button"
            loading={insertMutation.isPending || patchMutation.isPending}
            disabled={table.schema.columns.length === 0}
            onClick={submit}
          >
            {row ? "Lưu dòng" : "Thêm dòng"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
