import AppLayout from "@/components/app/AppLayout";
import AppSettingsAppearance from "@/components/app/AppSettingsAppearance";
import AppSettingsCollaborators from "@/components/app/AppSettingsCollaborators";
import AppSettingsControls from "@/components/app/AppSettingsControls";
import AppSettingsCredentials from "@/components/app/AppSettingsCredentials";
import AppSettingsDelete from "@/components/app/AppSettingsDelete";
import AppSettingsPresence from "@/components/app/AppSettingsPresence";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Cài đặt",
  },
];

export default function AppSettingsPage() {
  return (
    <AppLayout title="Cài đặt" breadcrumbs={breadcrumbs}>
      <div className="flex flex-col md:flex-row justify-between items-end space-y-5 md:space-y-0">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl mb-1">
            Cài đặt ứng dụng
          </h1>
          <p className="text-muted-foreground text-sm">
            Cấu hình cài đặt ứng dụng tại đây. Quản lý cộng tác viên và các cài
            đặt khác của ứng dụng.
          </p>
        </div>
      </div>
      <Separator className="my-8" />
      <div className="grid gap-6">
        <AppSettingsControls />
        <AppSettingsAppearance />
        <AppSettingsPresence />
        <AppSettingsCredentials />
        <AppSettingsCollaborators />
        <AppSettingsDelete />
      </div>
    </AppLayout>
  );
}
