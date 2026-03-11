import { LogEntry } from "@/lib/types/wire.gen";
import LogLevelBadge from "../app/LogLevelBadge";
import { formatRelative } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

export default function FlowLogList({ logs }: { logs?: LogEntry[] }) {
  if (!logs?.length) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="flex flex-col gap-2 text-muted-foreground text-sm">
          Chưa có nhật ký.
        </div>
      </div>
    );
  }

  return (
    <div className=" w-full h-full flex flex-col">
      <div className="p-5 flex-none">
        <div className="text-xl font-bold text-foreground mb-2">Nhật ký</div>
        <div className="text-muted-foreground">
          Xem nhật ký cho ứng dụng của bạn. Một số nhật ký do Vibe Bot tạo ra, nhưng bạn cũng có thể thêm nhật ký riêng vào luồng.
        </div>
      </div>

      <ScrollArea className="flex-auto">
        <div className="flex flex-col gap-2 px-4">
          {logs?.map((entry) => (
            <div
              key={entry!.id}
              className="flex flex-col gap-2 bg-muted/40 rounded-sm px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-40 flex-none text-left text-sm text-muted-foreground">
                  {formatRelative(new Date(entry!.created_at), new Date())}
                </div>

                <div className="flex-none">
                  <LogLevelBadge level={entry!.level} />
                </div>
              </div>

              <div className="flex-auto break-words font-mono text-sm">
                {entry!.message}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
