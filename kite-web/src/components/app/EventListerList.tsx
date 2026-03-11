import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import AutoAnimate from "../common/AutoAnimate";
import { useEventListeners } from "@/lib/hooks/api";
import EventListenerListEntry from "./EventListenerListEntry";
import AppEmptyPlaceholder from "./AppEmptyPlaceholder";
import EventListenerCreateDialog from "./EventListenerCreateDialog";

export default function EventListenerList() {
  const listeners = useEventListeners();

  const listenerCreateButton = (
    <EventListenerCreateDialog>
      <Button>Tạo bộ lắng nghe sự kiện</Button>
    </EventListenerCreateDialog>
  );

  return (
    <AutoAnimate className="flex flex-col md:flex-1 space-y-5">
      {!listeners ? (
        <>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </>
      ) : listeners.length === 0 ? (
        <AppEmptyPlaceholder
          title="Chưa có bộ lắng nghe sự kiện nào"
          description="Bạn có thể bắt đầu bằng cách tạo bộ lắng nghe sự kiện đầu tiên!"
          action={listenerCreateButton}
        />
      ) : (
        <>
          {listeners.map((listener, i) => (
            <EventListenerListEntry listener={listener!} key={i} />
          ))}
          <div className="flex">{listenerCreateButton}</div>
        </>
      )}
    </AutoAnimate>
  );
}
