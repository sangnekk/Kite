import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useAppSettingsQuery } from "@/lib/api/queries";
import { useAppSettingsUpdateMutation } from "@/lib/api/mutations";
import { useResponseData } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AppSettingsPrefixCommands() {
  const appId = useAppId();
  const settings = useResponseData(useAppSettingsQuery(appId));
  const updateMutation = useAppSettingsUpdateMutation(appId);

  const [enabled, setEnabled] = useState(false);
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enable_prefix_commands);
      setPrefix(settings.command_prefix);
    }
  }, [settings]);

  const hasIntent = !!settings?.message_content_intent;

  const onSave = useCallback(() => {
    updateMutation.mutate(
      {
        enable_prefix_commands: enabled,
        command_prefix: hasIntent ? prefix : "",
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã lưu cài đặt lệnh prefix!");
          } else {
            toast.error(
              `Lưu cài đặt thất bại: ${res.error.message} (${res.error.code})`
            );
          }
        },
      }
    );
  }, [updateMutation, enabled, prefix, hasIntent]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lệnh prefix</CardTitle>
        <CardDescription>
          Cho phép gọi lệnh bằng tin nhắn văn bản. Luôn có thể gọi lệnh bằng cách
          nhắc đến bot (<span className="font-mono">@bot tên-lệnh</span>) — kể cả
          khi chưa bật quyền đọc nội dung tin nhắn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base">Bật lệnh prefix / mention</Label>
            <p className="text-sm text-muted-foreground">
              Người dùng có thể chạy lệnh bằng <span className="font-mono">@bot</span>{" "}
              hoặc prefix bên dưới.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1">
          <Label className="text-base">Prefix tùy chỉnh</Label>
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="!"
            maxLength={16}
            disabled={!hasIntent || !enabled}
          />
          {!hasIntent ? (
            <p className="text-sm text-muted-foreground">
              Bị khoá: bot chưa có quyền <span className="font-semibold">Message
              Content Intent</span>. Bật quyền này trong Discord Developer Portal
              để dùng prefix tùy chỉnh. Hiện chỉ có thể gọi lệnh bằng @mention.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ví dụ: với prefix <span className="font-mono">!</span>, người dùng gõ{" "}
              <span className="font-mono">!ping</span>.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button onClick={onSave} disabled={updateMutation.isPending}>
          Lưu cài đặt
        </Button>
      </CardFooter>
    </Card>
  );
}
