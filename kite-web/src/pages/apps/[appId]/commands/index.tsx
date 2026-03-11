import AppLayout from "@/components/app/AppLayout";
import CommandList from "@/components/app/CommandList";
import { Separator } from "@/components/ui/separator";
import env from "@/lib/env/client";

const breadcrumbs = [
  {
    label: "Lệnh",
  },
];

export default function AppCommandsPage() {
  return (
    <AppLayout title="Lệnh" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">Lệnh</h1>
        <p className="text-muted-foreground text-sm">
          Tạo các lệnh tùy chỉnh cho ứng dụng để người dùng tương tác.{" "}
          <a
            href={`${env.NEXT_PUBLIC_DOCS_LINK}/reference/command`}
            target="_blank"
            className="text-primary hover:underline"
          >
            Tìm hiểu thêm
          </a>
        </p>
      </div>
      <Separator className="my-8" />
      <CommandList />
    </AppLayout>
  );
}
