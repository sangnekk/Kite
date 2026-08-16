import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import AutoAnimate from "../common/AutoAnimate";
import { useSchedules } from "@/lib/hooks/api";
import ScheduleListEntry from "./ScheduleListEntry";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import ScheduleCreateDialog from "./ScheduleCreateDialog";

export default function ScheduleList() {
  const schedules = useSchedules();

  const scheduleCreateButton = (
    <ScheduleCreateDialog>
      <Button>Tạo lịch biểu</Button>
    </ScheduleCreateDialog>
  );

  return (
    <AutoAnimate className="flex flex-col md:flex-1 space-y-5">
      {!schedules ? (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      ) : schedules.length === 0 ? (
        <AppEmptyPlaceholder
          title="Chưa có lịch biểu nào"
          description="Bạn có thể bắt đầu bằng cách tạo lịch biểu đầu tiên!"
          action={scheduleCreateButton}
        />
      ) : (
        <>
          {schedules.map((schedule, i) => (
            <ScheduleListEntry schedule={schedule!} key={i} />
          ))}
          <div className="flex">{scheduleCreateButton}</div>
        </>
      )}
    </AutoAnimate>
  );
}
