import {
  useCustomTableExportMutation,
  useCustomTableImportMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { CustomTable } from "@/lib/types/wire.gen";
import { DownloadIcon, FileJsonIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { ReactNode, useState } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const maxImportBytes = 5 * 1024 * 1024;

type TransferProps = {
  table: CustomTable;
  scopeId: string;
  children: ReactNode;
};

export function CustomTableImportDialog({ table, scopeId, children }: TransferProps) {
  const appId = useAppId();
  const mutation = useCustomTableImportMutation(appId, table.id);
  const [open, setOpen] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [file, setFile] = useState<File>();
  const [format, setFormat] = useState("csv");
  const [mode, setMode] = useState("append");

  function reset() {
    setFile(undefined);
    setFormat("csv");
    setMode("append");
    setConfirmReplace(false);
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function importRows() {
    if (!file) {
      toast.error("Hãy chọn file CSV hoặc JSON.");
      return;
    }
    if (file.size > maxImportBytes) {
      toast.error("File nhập không được vượt quá 5 MiB.");
      return;
    }

    try {
      const content = await file.text();
      mutation.mutate(
        { scope_id: scopeId, format, mode, content },
        {
          onSuccess(response) {
            if (!response.success) {
              toast.error(response.error.message);
              return;
            }
            toast.success(`Đã nhập ${response.data.inserted_rows} dòng vào ${table.name}.`);
            changeOpen(false);
          },
        }
      );
    } catch {
      toast.error("Không thể đọc file đã chọn.");
    }
  }

  function requestImport() {
    if (mode === "replace") setConfirmReplace(true);
    else void importRows();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhập dữ liệu vào {table.name}</DialogTitle>
            <DialogDescription>
              File dùng tên cột trong schema. Toàn bộ file được kiểm tra trước khi lưu.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor={`table-import-file-${table.id}`}>File dữ liệu</Label>
              <Input
                id={`table-import-file-${table.id}`}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  setFile(next);
                  if (next?.name.toLowerCase().endsWith(".json")) setFormat("json");
                  if (next?.name.toLowerCase().endsWith(".csv")) setFormat("csv");
                }}
              />
              <p className="text-xs text-muted-foreground">
                Tối đa 5 MiB và 10.000 dòng. CSV phải có hàng tiêu đề; JSON phải là một mảng object.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Định dạng</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cách nhập</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Thêm vào dữ liệu hiện có</SelectItem>
                    <SelectItem value="replace">Thay thế dữ liệu hiện có</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === "replace" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                Các dòng hiện tại trong phạm vi đang chọn sẽ bị xóa khi file hợp lệ. Nếu nhập lỗi,
                dữ liệu cũ vẫn được giữ nguyên.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => changeOpen(false)}>
              Hủy
            </Button>
            <LoadingButton
              loading={mutation.isPending}
              disabled={!file || (table.scope === "guild" && !scopeId)}
              onClick={requestImport}
            >
              <UploadIcon data-icon="inline-start" />
              Nhập dữ liệu
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thay thế dữ liệu hiện tại?</AlertDialogTitle>
            <AlertDialogDescription>
              Kite sẽ xóa các dòng hiện tại của phạm vi đang chọn và thay bằng dữ liệu trong file
              {file ? ` ${file.name}` : ""}. Thao tác chỉ được lưu khi toàn bộ file hợp lệ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kiểm tra lại</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => void importRows()}
            >
              Thay thế và nhập
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CustomTableExportDialog({ table, scopeId, children }: TransferProps) {
  const appId = useAppId();
  const mutation = useCustomTableExportMutation(appId, table.id);
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("csv");

  function exportRows() {
    mutation.mutate(
      { scope_id: scopeId, format },
      {
        onSuccess(response) {
          if (!response.success) {
            toast.error(response.error.message);
            return;
          }
          const blob = new Blob([response.data.content], { type: response.data.content_type });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = response.data.filename;
          link.click();
          URL.revokeObjectURL(url);
          toast.success(`Đã xuất ${response.data.row_count} dòng.`);
          setOpen(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu {table.name}</DialogTitle>
          <DialogDescription>
            File xuất chỉ chứa dữ liệu của phạm vi đang chọn và dùng tên cột trong schema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Button
            type="button"
            variant={format === "csv" ? "secondary" : "outline"}
            className="h-auto flex-col gap-2 py-5"
            onClick={() => setFormat("csv")}
          >
            <FileSpreadsheetIcon />
            CSV
          </Button>
          <Button
            type="button"
            variant={format === "json" ? "secondary" : "outline"}
            className="h-auto flex-col gap-2 py-5"
            onClick={() => setFormat("json")}
          >
            <FileJsonIcon />
            JSON
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <LoadingButton
            loading={mutation.isPending}
            disabled={table.scope === "guild" && !scopeId}
            onClick={exportRows}
          >
            <DownloadIcon data-icon="inline-start" />
            Tải file
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
