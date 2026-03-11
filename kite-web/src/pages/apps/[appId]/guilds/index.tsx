import AppLayout from "@/components/app/AppLayout";
import AppStateGuildList from "@/components/app/AppStateGuildList";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [
  {
    label: "Khám phá Server",
  },
];

export default function AppGuildsPage() {
  return (
    <AppLayout title="Khám phá Server" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">
          Khám phá Server
        </h1>
        <p className="text-muted-foreground text-sm">
          Khám phá các server ứng dụng đang hoạt động.
        </p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-5">
        <AppStateGuildList />
      </div>
    </AppLayout>
  );
}
