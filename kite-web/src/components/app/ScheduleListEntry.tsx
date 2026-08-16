import {
  useScheduleDeleteMutation,
  useScheduleUpdateEnabledMutation,
} from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { Schedule } from "@/lib/types/wire.gen";
import { formatDateTime } from "@/lib/utils";
import {
  CheckIcon,
  ClockIcon,
  EllipsisIcon,
  Trash2Icon,
} from "lucide-react";
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

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function describeTrigger(schedule: Schedule): string {
  if (schedule.trigger_type === "interval") {
    const seconds = schedule.interval_seconds;
    if (seconds % 3600 === 0 && seconds >= 3600) {
      return `Mỗi ${seconds / 3600} giờ`;
    }
    if (seconds % 60 === 0) {
      return `Mỗi ${seconds / 60} phút`;
    }
    return `Mỗi ${seconds} giây`;
  }
  return `Cron "${schedule.cron_expression}" (${schedule.timezone})`;
}

export default function ScheduleListEntry({
  schedule,
}: {
  schedule: Schedule;
}) {
  const router = useRouter();
  const appId = useAppId();

  const deleteMutation = useScheduleDeleteMutation(appId, schedule.id);
  const updateEnabledMutation = useScheduleUpdateEnabledMutation(
    appId,
    schedule.id
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const remove = useCallback(() => {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa lịch biểu!");
        } else {
          toast.error(
            `Xóa lịch biểu thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }, [deleteMutation]);

  const toggleEnabled = useCallback(() => {
    updateEnabledMutation.mutate({ enabled: !schedule.enabled });
  }, [updateEnabledMutation, schedule.enabled]);

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
            {formatDateTime(new Date(schedule.updated_at))}
          </div>
        </div>
        <div className="flex justify-end">
          <Switch checked={schedule.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-muted-foreground" />
          <div>{describeTrigger(schedule)}</div>
        </CardTitle>
        <CardDescription className="text-sm">
          {schedule.description}
          {schedule.enabled && schedule.next_run_at ? (
            <span className="block text-xs text-muted-foreground mt-1">
              Lần chạy tiếp theo:{" "}
              {formatDateTime(new Date(schedule.next_run_at))}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex space-x-3">
        <Button size="sm" variant="outline" asChild>
          <Link
            href={{
              pathname: "/apps/[appId]/schedules/[scheduleId]",
              query: {
                appId: router.query.appId,
                scheduleId: schedule.id,
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
                Xóa lịch biểu
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Bạn có chắc chắn muốn xóa lịch biểu này?"
        description="Điều này sẽ xóa lịch biểu khỏi ứng dụng và không thể hoàn tác."
        onConfirm={remove}
      />
    </Card>
  );
}
