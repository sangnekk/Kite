import AppLayout from "@/components/app/AppLayout";
import { PluginList } from "@/components/app/PluginList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Plugin",
  },
];

export default function AppPluginsPage() {
  return (
    <AppLayout title="Plugin" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Plugin</h1>
        <p className="text-muted-foreground text-sm">
          Plugin dùng để mở rộng tính năng ứng dụng mà không cần tự xây dựng.
          Plugin hoạt động riêng biệt với các lệnh, sự kiện và mẫu tin nhắn
          của bạn.
        </p>
      </div>
      <Separator className="my-8" />
      <PluginList />
    </AppLayout>
  );
}
