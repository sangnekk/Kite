import {
  useEventListenerDeleteMutation,
  useEventListenerUpdateEnabledMutation,
} from "@/lib/api/mutations";
import { useCustomEvents } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { EventListener } from "@/lib/types/wire.gen";
import { formatDateTime } from "@/lib/utils";
import {
  CheckIcon,
  CopyPlusIcon,
  EllipsisIcon,
  SatelliteDishIcon,
  RadioTowerIcon,
  Trash2Icon,
  WebhookIcon,
} from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  discord: "Discord",
  sepay: "SePay",
  thueapibank: "ThueAPIBank",
  custom_webhook: "Webhook tùy chỉnh",
  internal: "Sự kiện nội bộ",
};
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import ConfirmDialog from "../common/ConfirmDialog";
import { Button } from "../ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Switch } from "../ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import EventListenerDuplicateDialog from "./EventListenerDuplicateDialog";

export default function EventListenerListEntry({
  listener,
}: {
  listener: EventListener;
}) {
  const router = useRouter();

  const appId = useAppId();
  const customEvents = useCustomEvents() ?? [];
  const customEvent = customEvents.find(
    (event) => event?.id === listener.custom_event_id
  );

  const deleteMutation = useEventListenerDeleteMutation(appId, listener.id);

  const updateEnabledMutation = useEventListenerUpdateEnabledMutation(
    appId,
    listener.id
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const remove = useCallback(() => {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa sự kiện!");
        } else {
          toast.error(
            `Xóa sự kiện thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }, [deleteMutation]);

  const toggleEnabled = useCallback(() => {
    updateEnabledMutation.mutate({ enabled: !listener.enabled });
  }, [updateEnabledMutation, listener.enabled]);

  return (
    <Card className="relative">
      <div className="absolute top-0 right-0 py-3 pr-3 h-full flex flex-col justify-between">
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger>
              <CheckIcon className="h-5 w-5 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-foreground/90">
                Tất cả thay đổi đã được triển khai!
              </div>
            </TooltipContent>
          </Tooltip>
          <div className="text-sm text-muted-foreground">
            {formatDateTime(new Date(listener.updated_at))}
          </div>
        </div>
        <div className="flex justify-end">
          <Switch checked={listener.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          {listener.source === "internal" ? (
            <RadioTowerIcon className="h-5 w-5 text-muted-foreground" />
          ) : listener.source === "discord" ? (
            <SatelliteDishIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <WebhookIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            {listener.source === "internal"
              ? <span className="font-mono">{customEvent?.name ?? listener.type}</span>
              : listener.source !== "discord"
              ? SOURCE_LABELS[listener.source] ?? listener.source
              : listener.type}
          </div>
        </CardTitle>
        <CardDescription className="text-sm">
          {listener.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex space-x-3">
        <Button size="sm" variant="outline" asChild>
          <Link
            href={{
              pathname: "/apps/[appId]/events/[eventId]",
              query: {
                appId: router.query.appId,
                eventId: listener.id,
              },
            }}
          >
            Quản lý
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <EllipsisIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)}>
                <Trash2Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                Xóa bộ lắng nghe
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDuplicateDialogOpen(true)}>
                <CopyPlusIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                Nhân đôi bộ lắng nghe
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Bạn có chắc chắn muốn xóa bộ lắng nghe này?"
        description="Điều này sẽ xóa bộ lắng nghe khỏi ứng dụng và không thể hoàn tác."
        onConfirm={remove}
      />
      <EventListenerDuplicateDialog
        listener={listener}
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
      />
    </Card>
  );
}
