import AppLayout from "@/components/app/AppLayout";
import { IntegrationList } from "@/components/app/IntegrationList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Tích hợp",
  },
];

export default function AppIntegrationsPage() {
  return (
    <AppLayout title="Tích hợp" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Tích hợp</h1>
        <p className="text-muted-foreground text-sm">
          Kết nối bot của bạn với các dịch vụ bên ngoài thông qua webhook. Bật
          tích hợp để nhận sự kiện từ SePay, ThueAPIBank hoặc webhook tùy chỉnh.
        </p>
      </div>
      <Separator className="my-8" />
      <IntegrationList />
    </AppLayout>
  );
}
