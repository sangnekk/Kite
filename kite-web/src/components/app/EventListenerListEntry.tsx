import {
  useEventListenerDeleteMutation,
  useEventListenerUpdateEnabledMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { EventListener } from "@/lib/types/wire.gen";
import { formatDateTime } from "@/lib/utils";
import {
  CheckIcon,
  CopyPlusIcon,
  EllipsisIcon,
  SatelliteDishIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";
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

  const deleteMutation = useEventListenerDeleteMutation(appId, listener.id);

  const updateEnabledMutation = useEventListenerUpdateEnabledMutation(
    appId,
    listener.id
  );

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
          <SatelliteDishIcon className="h-5 w-5 text-muted-foreground" />
          <div>{listener.type}</div>
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
              <ConfirmDialog
                title="Bạn có chắc chắn muốn xóa bộ lắng nghe này?"
                description="Điều này sẽ xóa bộ lắng nghe khỏi ứng dụng và không thể hoàn tác."
                onConfirm={remove}
              >
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Trash2Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  Xóa bộ lắng nghe
                </DropdownMenuItem>
              </ConfirmDialog>
              <EventListenerDuplicateDialog listener={listener}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <CopyPlusIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  Nhân đôi bộ lắng nghe
                </DropdownMenuItem>
              </EventListenerDuplicateDialog>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
