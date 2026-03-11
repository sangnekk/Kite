import AppLayout from "@/components/app/AppLayout";
import LogEntryList from "@/components/app/LogEntryList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Nhật ký",
  },
];

export default function AppLogsPage() {
  return (
    <AppLayout title="Nhật ký" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Nhật ký</h1>
        <p className="text-muted-foreground text-sm">
          Xem nhật ký của ứng dụng. Một số nhật ký được tạo bởi Vibe Bot, bạn cũng
          có thể thêm nhật ký riêng vào các flow.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-5">
        <LogEntryList />
      </div>
    </AppLayout>
  );
}
