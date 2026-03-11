import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStateStatusQuery, useUserQuery } from "@/lib/api/queries";
import { useApp, useResponseData, useUsageCredits } from "@/lib/hooks/api";
import { formatDate } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import { useCallback } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import AppInviteButton from "./AppInviteButton";

export default function AppInfoCard() {
  const app = useApp();

  const ownerUser = useResponseData(useUserQuery(app?.owner_user_id));

  const appStatus = useResponseData(useAppStateStatusQuery(app?.id));

  const copyAppId = useCallback(() => {
    navigator.clipboard.writeText(app?.id || "");
  }, [app?.id]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start bg-muted/50">
        <div className="grid gap-0.5">
          <CardTitle className="text-lg">
            {app?.name || "Ứng dụng không xác định"}
          </CardTitle>
          <CardDescription className="group flex items-center gap-2">
            {app?.id}

            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={copyAppId}
            >
              <CopyIcon className="h-3 w-3" />
              <span className="sr-only">Copy App ID</span>
            </Button>
          </CardDescription>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <AppInviteButton />
        </div>
      </CardHeader>
      <CardContent className="p-6 text-sm">
        <div className="grid gap-3">
          <div className="font-semibold">Chi tiết ứng dụng</div>
          <ul className="grid gap-3">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Ngày tạo</span>
              <span>{app ? formatDate(new Date(app.created_at)) : null}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Cập nhật lần cuối</span>
              <span>{app ? formatDate(new Date(app.updated_at)) : null}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Chủ sở hữu</span>
              <span>
                {ownerUser ? ownerUser.display_name : app?.owner_user_id}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Discord App ID</span>
              <span>{app?.discord_id}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Trạng thái</span>
              <span>
                {appStatus === undefined
                  ? "-"
                  : appStatus.online
                  ? "Online"
                  : "Offline"}
              </span>
            </li>
          </ul>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3">
          <div className="font-semibold">Gói đăng ký</div>
          <div>
            <Badge className="px-3 py-1">Open Beta</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
