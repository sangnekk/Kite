import { useCustomEvents } from "@/lib/hooks/api";
import { PencilIcon, PlusIcon, RadioTowerIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import CustomEventDialog from "./CustomEventDialog";

export default function CustomEventRegistry() {
  const events = useCustomEvents();

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold md:text-2xl mb-1">
            Sự kiện nội bộ
          </h2>
          <p className="text-sm text-muted-foreground">
            Đăng ký event key một lần tại đây. Các node phát và flow lắng nghe
            chỉ chọn từ registry này.
          </p>
        </div>
        <CustomEventDialog>
          <Button className="min-h-11 w-full flex-none gap-2 sm:w-auto">
            <PlusIcon className="h-4 w-4" />
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
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Chưa có event key nào. Đăng ký event đầu tiên trước khi thêm node phát
          hoặc bộ lắng nghe.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map(
            (event) =>
              event && (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4"
                >
                  <div className="rounded-md bg-muted p-2">
                    <RadioTowerIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">
                      {event.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {event.description || "Không có mô tả"}
                    </div>
                  </div>
                  <CustomEventDialog event={event}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="min-h-11 min-w-11"
                      aria-label={`Sửa ${event.name}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </CustomEventDialog>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
