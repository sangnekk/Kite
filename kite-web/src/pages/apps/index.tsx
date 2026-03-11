import AppList from "@/components/app/AppList";
import BaseLayout from "@/components/common/BaseLayout";
import { Separator } from "@/components/ui/separator";

export default function AppListPage() {
  return (
    <BaseLayout title="Ứng dụng">
      <div className="flex flex-1 justify-center items-center min-h-[100dvh] w-full px-5 pt-10 pb-20">
        <div className="w-full max-w-lg">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl mb-1">
              Ứng dụng của bạn
            </h1>
            <p className="text-muted-foreground text-sm">
              Ứng dụng là nơi bạn quản lý các plugin, tích hợp và cài đặt.
              Tạo ứng dụng hoặc nhờ nhóm của bạn mời bạn.
            </p>
          </div>
          <Separator className="my-4" />
          <AppList />
        </div>
      </div>
    </BaseLayout>
  );
}
