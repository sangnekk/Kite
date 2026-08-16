import AppLayout from "@/components/app/AppLayout";
import ScheduleList from "@/components/app/ScheduleList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Lịch biểu",
  },
];

export default function AppSchedulesPage() {
  return (
    <AppLayout title="Lịch biểu" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Lịch biểu</h1>
        <p className="text-muted-foreground text-sm">
          Chạy luồng tự động theo lịch định kỳ — mỗi vài phút, hằng ngày, hằng
          tuần hoặc theo cron.
        </p>
      </div>
      <Separator className="my-8" />
      <ScheduleList />
    </AppLayout>
  );
}
