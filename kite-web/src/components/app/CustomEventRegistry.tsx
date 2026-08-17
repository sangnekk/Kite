import { useAppFeatures, useCustomEvents } from "@/lib/hooks/api";
import { PencilIcon, PlusIcon, RadioTowerIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import CustomEventDialog from "./CustomEventDialog";

export default function CustomEventRegistry() {
  const events = useCustomEvents();
  const features = useAppFeatures();
  const eventCount = events?.filter(Boolean).length ?? 0;
  const maxEvents = features?.max_custom_events ?? 0;
  const limitReached = Boolean(features) && maxEvents >= 0 && eventCount >= maxEvents;
  const quotaLabel =
    maxEvents === -1
      ? `${eventCount} event · không giới hạn`
      : maxEvents === 0
        ? `${eventCount} event · gói đã khóa`
        : `${eventCount}/${maxEvents} event`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold md:text-2xl">Sự kiện nội bộ</h2>
            {features && <Badge variant="outline">{quotaLabel}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Đăng ký event key một lần tại đây. Các node phát và flow lắng nghe chỉ chọn từ
            registry này.
          </p>
        </div>
        <CustomEventDialog>
          <Button
            className="min-h-11 w-full flex-none sm:w-auto"
            disabled={limitReached}
            title={limitReached ? "Gói hiện tại đã đạt giới hạn sự kiện nội bộ" : undefined}
          >
            <PlusIcon data-icon="inline-start" />
            Đăng ký event
          </Button>
        </CustomEventDialog>
      </div>

      {!events ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {maxEvents === 0 ? "Gói hiện tại không có Custom Event" : "Chưa có event key"}
            </CardTitle>
            <CardDescription>
              {maxEvents === 0
                ? "Nâng cấp hoặc đổi gói để đăng ký sự kiện nội bộ."
                : "Đăng ký event đầu tiên trước khi thêm node phát hoặc bộ lắng nghe."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map(
            (event) =>
              event && (
                <Card key={event.id}>
                  <CardHeader className="flex flex-row items-center gap-3 p-3 sm:p-4">
                    <div className="flex size-10 flex-none items-center justify-center rounded-md bg-muted">
                      <RadioTowerIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate font-mono text-sm">{event.name}</CardTitle>
                      <CardDescription className="truncate text-xs">
                        {event.description || "Không có mô tả"}
                      </CardDescription>
                    </div>
                    <CustomEventDialog event={event}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="min-h-11 min-w-11"
                        aria-label={`Sửa ${event.name}`}
                      >
                        <PencilIcon />
                      </Button>
                    </CustomEventDialog>
                  </CardHeader>
                </Card>
              )
          )}
        </div>
      )}
    </div>
  );
}
