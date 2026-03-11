import { ReactNode, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "../ui/dialog";
import { useCommandsDeployMutation } from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import LoadingButton from "../common/LoadingButton";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useEdges } from "@xyflow/react";

export function CommandDeployDialog({
  children,
  open,
  onOpenChange,
}: {
  children?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const appId = useAppId();
  const deployMutation = useCommandsDeployMutation(appId);

  const [error, setError] = useState<string | null>(null);

  function onDeploy() {
    deployMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          if (res.data.deployed) {
            toast.success(
              "Triển khai lệnh thành công! Khởi động lại Discord nếu thay đổi chưa hiển thị ngay."
            );
            onOpenChange(false);
            setError(null);
          } else {
            setError(JSON.stringify(res.data.error, null, 2));
          }
        } else {
          toast.error(
            `Triển khai lệnh thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-xl w-full overflow-x-auto">
        <DialogHeader>
          <DialogTitle>Triển khai lệnh</DialogTitle>
          <DialogDescription>
            Triển khai các lệnh để chúng khả dụng trên Discord. Mỗi khi
            bạn thay đổi giao diện của lệnh, cần triển khai lại
            để thay đổi có hiệu lực.
            <br />
            <br />
            Bạn chỉ có thể triển khai lệnh mỗi 30 giây, vì vậy hãy chỉ triển khai
            khi bạn thực sự đã thay đổi.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div>
            <div className="text-destructive font-medium mb-2">
              Lỗi triển khai
            </div>
            <div className="bg-destructive/10 border border-destructive p-4 rounded-md font-mono whitespace-pre text-sm overflow-auto w-full">
              {error}
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Hủy</Button>
          </DialogClose>
          <LoadingButton loading={deployMutation.isPending} onClick={onDeploy}>
            Triển khai lệnh
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
