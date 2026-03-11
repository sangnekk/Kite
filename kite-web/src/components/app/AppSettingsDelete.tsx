import { useAppDeleteMutation } from "@/lib/api/mutations";
import ConfirmDialog from "../common/ConfirmDialog";
import { Button } from "../ui/button";
import { useAppId } from "@/lib/hooks/params";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { Card, CardContent } from "../ui/card";

export default function AppSettingsDelete() {
  const router = useRouter();
  const deleteMutation = useAppDeleteMutation(useAppId());

  function remove() {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa ứng dụng!");
          router.push("/apps");
        } else {
          toast.error(
            `Xóa ứng dụng thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold pb-1">Xóa ứng dụng</div>
            <div className="text-muted-foreground">
              Xóa ứng dụng sẽ loại bỏ nó khỏi Vibe Bot và xóa tất cả
              dữ liệu liên quan.
            </div>
          </div>
          <ConfirmDialog
            title="Bạn có chắc chắn muốn xóa ứng dụng này?"
            description="Điều này sẽ xóa tất cả dữ liệu liên quan và không thể hoàn tác."
            onConfirm={remove}
          >
            <Button
              variant="destructive"
              className="space-x-2 flex items-center"
            >
              <div>Xóa ứng dụng</div>
            </Button>
          </ConfirmDialog>
        </div>
      </CardContent>
    </Card>
  );
}
