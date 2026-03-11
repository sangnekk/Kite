import AppLayout from "@/components/app/AppLayout";
import VariableList from "@/components/app/VariableList";
import { Separator } from "@/components/ui/separator";
import env from "@/lib/env/client";

const breadcrumbs = [
  {
    label: "Biến lưu trữ",
  },
];

export default function AppVariablesPage() {
  return (
    <AppLayout title="Biến lưu trữ" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">
          Biến lưu trữ
        </h1>
        <p className="text-muted-foreground text-sm">
          Quản lý biến lưu trữ trong ứng dụng. Biến lưu trữ là cặp key-value
          có thể dùng để lưu dữ liệu giữa các lệnh, sự kiện và nhiều thứ
          khác.{" "}
          <a
            href={`${env.NEXT_PUBLIC_DOCS_LINK}/reference/variable`}
            target="_blank"
            className="text-primary hover:underline"
          >
            Tìm hiểu thêm
          </a>
        </p>
      </div>
      <Separator className="my-8" />
      <VariableList />
    </AppLayout>
  );
}
