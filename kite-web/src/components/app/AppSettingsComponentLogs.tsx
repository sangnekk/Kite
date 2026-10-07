import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useAppSettingsQuery } from "@/lib/api/queries";
import { useAppSettingsUpdateMutation } from "@/lib/api/mutations";
import { useResponseData } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useCallback } from "react";
import { toast } from "sonner";

export default function AppSettingsComponentLogs() {
  const appId = useAppId();
  const settings = useResponseData(useAppSettingsQuery(appId));
  const updateMutation = useAppSettingsUpdateMutation(appId);

  const onToggle = useCallback(
    (enabled: boolean) => {
      if (!settings) return;

      updateMutation.mutate(
        {
          enable_prefix_commands: settings.enable_prefix_commands,
          command_prefix: settings.command_prefix,
          log_component_interactions: enabled,
        },
        {
          onSuccess(res) {
            if (res.success) {
              toast.success(
                enabled
                  ? "Đã bật ghi nhật ký tương tác!"
                  : "Đã tắt ghi nhật ký tương tác!"
              );
            } else {
              toast.error(
                `Lưu cài đặt thất bại: ${res.error.message} (${res.error.code})`
              );
            }
          },
        }
      );
    },
    [updateMutation, settings]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhật ký nút & menu chọn</CardTitle>
        <CardDescription>
          Ghi lại mỗi lần người dùng bấm nút hoặc chọn trong menu vào nhật ký của
          ứng dụng (người dùng, thành phần và lựa chọn). Lỗi luôn được ghi lại,
          kể cả khi tắt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base">Ghi nhật ký mọi tương tác</Label>
            <p className="text-sm text-muted-foreground">
              Không ghi nội dung tin nhắn, chỉ ghi ID người dùng và nhãn / giá
              trị đã chọn.
            </p>
          </div>
          <Switch
            checked={!!settings?.log_component_interactions}
            onCheckedChange={onToggle}
            disabled={!settings || updateMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
