import {
  useCommandDeleteMutation,
  useCommandUpdateEnabledMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { Command } from "@/lib/types/wire.gen";
import { formatDateTime } from "@/lib/utils";
import {
  CheckIcon,
  CircleDotIcon,
  CopyPlusIcon,
  EllipsisIcon,
  SlashSquareIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
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
import CommandDuplicateDialog from "./CommandDuplicateDialog";

export default function CommandListEntry({
  command,
  onDeleted,
}: {
  command: Command;
  onDeleted?: () => void;
}) {
  const router = useRouter();

  const appId = useAppId();

  const deleteMutation = useCommandDeleteMutation(appId, command.id);
  const updateEnabledMutation = useCommandUpdateEnabledMutation(
    appId,
    command.id
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  const remove = useCallback(() => {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa lệnh!");
          onDeleted?.();
        } else {
          toast.error(
            `Xóa lệnh thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }, [deleteMutation, onDeleted]);

  const toggleEnabled = useCallback(() => {
    updateEnabledMutation.mutate({
      enabled: !command.enabled,
    });
  }, [updateEnabledMutation, command.enabled]);

  const changesDeployed = useMemo(
    () =>
      new Date(command.updated_at) <= new Date(command.last_deployed_at || 0),
    [command]
  );

  return (
    <Card className="relative">
      <div className="absolute top-0 right-0 py-3 pr-3 h-full flex flex-col justify-between">
        <div className="flex items-center space-x-2">
          {changesDeployed ? (
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
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <CircleDotIcon className="h-5 w-5 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-foreground/90">
                  Thay đổi gần nhất sẽ được triển khai sớm.
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <div className="text-sm text-muted-foreground">
            {formatDateTime(new Date(command.updated_at))}
          </div>
        </div>
        <div className="flex justify-end">
          <Switch checked={command.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <SlashSquareIcon className="h-5 w-5 text-muted-foreground" />
          <div>{command.name}</div>
        </CardTitle>
        <CardDescription className="text-sm">
          {command.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex space-x-3">
        <Button size="sm" variant="outline" asChild>
          <Link
            href={{
              pathname: "/apps/[appId]/commands/[cmdId]",
              query: {
                appId: router.query.appId,
                cmdId: command.id,
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
                Xóa lệnh
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDuplicateDialogOpen(true)}>
                <CopyPlusIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                Nhân đôi lệnh
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Bạn có chắc chắn muốn xóa lệnh này?"
        description="Điều này sẽ xóa lệnh khỏi ứng dụng và không thể hoàn tác."
        onConfirm={remove}
      />
      <CommandDuplicateDialog
        command={command}
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
      />
    </Card>
  );
}
