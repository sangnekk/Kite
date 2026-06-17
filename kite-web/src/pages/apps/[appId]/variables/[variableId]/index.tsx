import AppLayout from "@/components/app/AppLayout";
import VariableSettingsCore from "@/components/app/VariableSettingsCore";
import { Separator } from "@/components/ui/separator";
import { useVariable } from "@/lib/hooks/api";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { toast } from "sonner";

export default function AppVariablesPage() {
  const router = useRouter();

  const variable = useVariable((res) => {
    if (!res.success) {
      toast.error(
        `Tải biến thất bại: ${res.error.message} (${res.error.code})`
      );
      if (res.error.code === "unknown_variable") {
        router.push({
          pathname: "/apps/[appId]/variables",
          query: { appId: router.query.appId },
        });
      }
    }
  });

  const breadcrumbs = useMemo(
    () => [
      {
        label: "Stored Variables",
        href: `/apps/[appId]/variables`,
      },
      {
        label: variable?.name || "unknown",
      },
    ],
    [variable]
  );

  return (
    <AppLayout title={variable?.name || "không xác định"} breadcrumbs={breadcrumbs}>
      <div>
        <h1 className="text-lg font-semibold md:text-2xl mb-1">
          <span className="text-muted-foreground">Biến:</span>{" "}
          {variable?.name || "không xác định"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Cấu hình biến lưu trữ của bạn và xác định dữ liệu mà nó lưu giữ.
        </p>
      </div>
      <Separator className="my-8" />
      <VariableSettingsCore />
    </AppLayout>
  );
}
