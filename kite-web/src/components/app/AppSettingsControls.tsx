import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import { Button } from "../ui/button";
import { useApp } from "@/lib/hooks/api";
import { useAppUpdateMutation } from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { toast } from "sonner";

export default function AppSettingsControls() {
  const app = useApp();

  const updateMutation = useAppUpdateMutation(useAppId());

  function toggleEnabled() {
    if (!app) return;

    updateMutation.mutate(
      {
        name: app.name,
        description: app.description,
        enabled: !app.enabled,
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success(app.enabled ? "Đã tắt ứng dụng!" : "Đã bật ứng dụng!");
          } else {
            toast.error(
              `Cập nhật ứng dụng thất bại: ${res.error.message} (${res.error.code})`
            );
          }
        },
      }
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold pb-1">Khởi động ứng dụng</div>
            <div className="text-muted-foreground">
              Khởi động ứng dụng sẽ hiển thị trạng thái trực tuyến trên Discord
              và cho phép người dùng tương tác với nó.
            </div>
          </div>
          <Button
            disabled={app?.enabled}
            variant="secondary"
            onClick={toggleEnabled}
          >
            Khởi động
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold pb-1">Dừng ứng dụng</div>
            <div className="text-muted-foreground">
              Dừng ứng dụng sẽ hiển thị trạng thái ngoại tuyến trên Discord
              và ngăn người dùng tương tác với nó.
            </div>
          </div>
          <Button
            disabled={!app?.enabled}
            variant="secondary"
            onClick={toggleEnabled}
          >
            Dừng lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
