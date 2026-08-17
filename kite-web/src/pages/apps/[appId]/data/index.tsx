import AppLayout from "@/components/app/AppLayout";
import CustomTableWorkbench from "@/components/app/CustomTableWorkbench";
import { Separator } from "@/components/ui/separator";

const breadcrumbs = [{ label: "Dữ liệu" }];

export default function AppDataPage() {
  return (
    <AppLayout title="Dữ liệu" breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="mb-1 text-lg font-semibold md:text-2xl">Dữ liệu</h1>
        <p className="text-sm text-muted-foreground">
          Thiết kế bảng có kiểu dữ liệu rõ ràng, xem và chỉnh sửa các bản ghi mà
          flow của bot đang sử dụng.
        </p>
      </div>
      <Separator className="my-6" />
      <CustomTableWorkbench />
    </AppLayout>
  );
}
