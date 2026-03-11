import AppLayout from "@/components/app/AppLayout";
import { TemplateList } from "@/components/app/TemplateList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Mẫu",
  },
];

export default function AppTemplatesPage() {
  return (
    <AppLayout title="Mẫu ứng dụng" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Mẫu</h1>
        <p className="text-muted-foreground text-sm">
          Chọn một mẫu bên dưới để bắt đầu. Mẫu giúp bạn xây dựng ứng dụng
          nhanh hơn và có thể chứa lệnh, bộ lắng nghe sự kiện, mẫu tin nhắn
          và nhiều thứ khác.
        </p>
      </div>
      <Separator className="my-8" />
      <TemplateList />
    </AppLayout>
  );
}
