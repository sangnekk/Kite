import AppLayout from "@/components/app/AppLayout";
import EventListenerList from "@/components/app/EventListerList";
import { Separator } from "@/components/ui/separator";
import env from "@/lib/env/client";

const breadcrumbs = [
  {
    label: "Sự kiện",
  },
];

export default function AppEventsPage() {
  return (
    <AppLayout title="Sự kiện" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">
          Bộ lắng nghe sự kiện
        </h1>
        <p className="text-muted-foreground text-sm">
          Lắng nghe sự kiện từ ứng dụng và thực hiện hành động dựa trên đó.{" "}
          <a
            href={`${env.NEXT_PUBLIC_DOCS_LINK}/reference/event`}
            target="_blank"
            className="text-primary hover:underline"
          >
            Tìm hiểu thêm
          </a>
        </p>
      </div>
      <Separator className="my-8" />
      <EventListenerList />
    </AppLayout>
  );
}
