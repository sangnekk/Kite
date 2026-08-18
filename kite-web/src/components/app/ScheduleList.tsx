import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import AutoAnimate from "../common/AutoAnimate";
import { useAppFeatures, useSchedules } from "@/lib/hooks/api";
import ScheduleListEntry from "./ScheduleListEntry";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import ScheduleCreateDialog from "./ScheduleCreateDialog";
import { Badge } from "../ui/badge";
import { ArrowUpRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useAppId } from "@/lib/hooks/params";

export default function ScheduleList() {
  const schedules = useSchedules();
  const features = useAppFeatures();
  const appId = useAppId();
  const scheduleCount = schedules?.filter(Boolean).length ?? 0;
  const maxSchedules = features?.max_schedules ?? 0;
  const limitReached =
    Boolean(features) && maxSchedules >= 0 && scheduleCount >= maxSchedules;
  const quotaLabel =
    maxSchedules === -1
      ? `${scheduleCount} lịch biểu · không giới hạn`
      : maxSchedules === 0
        ? `${scheduleCount} lịch biểu · gói đã khóa`
        : `${scheduleCount}/${maxSchedules} lịch biểu`;

  const scheduleCreateButton = (
    <ScheduleCreateDialog>
      <Button
        className="min-h-11 w-full gap-2 sm:w-auto"
        disabled={limitReached}
        title={
          limitReached
            ? "Gói hiện tại đã đạt giới hạn lịch biểu tự động"
            : undefined
        }
      >
        <PlusIcon data-icon="inline-start" className="size-4" />
        Tạo lịch biểu
      </Button>
    </ScheduleCreateDialog>
  );

  const upgradeButton = (
    <Button asChild className="min-h-11 w-full gap-2 sm:w-auto">
      <Link
        href={{
          pathname: "/apps/[appId]/premium",
          query: { appId },
        }}
      >
        <ArrowUpRightIcon data-icon="inline-start" className="size-4" />
        Xem gói nâng cấp
      </Link>
    </Button>
  );

  return (
    <AutoAnimate className="flex flex-col gap-5 md:flex-1">
      {features ? (
        <div className="flex justify-end">
          <Badge variant="outline">{quotaLabel}</Badge>
        </div>
      ) : null}
      {!schedules ? (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      ) : schedules.length === 0 ? (
        <AppEmptyPlaceholder
          title="Chưa có lịch biểu nào"
          description={
            maxSchedules === 0
              ? "Gói hiện tại không hỗ trợ lịch biểu tự động. Hãy nâng cấp để sử dụng tính năng này."
              : "Tạo lịch biểu đầu tiên để chạy flow theo giờ, ngày hoặc biểu thức cron."
          }
          action={maxSchedules === 0 ? upgradeButton : scheduleCreateButton}
        />
      ) : (
        <>
          {schedules.map((schedule) => (
            <ScheduleListEntry
              schedule={schedule!}
              locked={maxSchedules === 0}
              key={schedule!.id}
            />
          ))}
          <div className="flex">{scheduleCreateButton}</div>
        </>
      )}
    </AutoAnimate>
  );
}
