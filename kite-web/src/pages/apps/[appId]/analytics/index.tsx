import AppLayout from "@/components/app/AppLayout";
import { BigChartCard } from "@/components/app/BigChartCard";
import { ChartCards } from "@/components/app/ChartCards";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Thống kê",
  },
];

export default function AppAnalyticsPage() {
  return (
    <AppLayout title="Thống kê" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Thống kê</h1>
        <p className="text-muted-foreground text-sm">
          Phân tích hiệu suất ứng dụng và đưa ra quyết định dựa trên dữ liệu.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-5">
        <ChartCards />
        <BigChartCard />
      </div>
    </AppLayout>
  );
}
