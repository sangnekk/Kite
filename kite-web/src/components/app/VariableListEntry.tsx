import { StretchHorizontalIcon, VariableIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useRouter } from "next/router";
import Link from "next/link";
import { Variable } from "@/lib/types/wire.gen";
import ConfirmDialog from "../common/ConfirmDialog";
import { useVariableDeleteMutation } from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { toast } from "sonner";

export default function VariableListEntry({
  variable,
}: {
  variable: Variable;
}) {
  const router = useRouter();

  const deleteMutation = useVariableDeleteMutation(useAppId(), variable.id);

  function remove() {
    deleteMutation.mutate(undefined, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã xóa biến!");
        } else {
          toast.error(
            `Xóa biến thất bại: ${res.error.message} (${res.error.code})`
          );
        }
      },
    });
  }

  return (
    <Card>
      <div className="float-right pt-3 pr-4">
        <div className="flex items-center space-x-2">
          <StretchHorizontalIcon className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm">{variable.total_values || 0} giá trị</div>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-base flex items-center space-x-2">
          <VariableIcon className="h-5 w-5 text-muted-foreground" />
          <div>{variable.name}</div>
        </CardTitle>
        <CardDescription className="text-sm">
          Biến này lưu trữ{" "}
          {variable.scoped
            ? "nhiều giá trị theo khóa cụ thể."
            : "một giá trị."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex space-x-3">
        <Button size="sm" variant="outline" asChild>
          <Link
            href={{
              pathname: "/apps/[appId]/variables/[variableId]",
              query: {
                appId: router.query.appId,
                variableId: variable.id,
              },
            }}
          >
            Quản lý
          </Link>
        </Button>
        <ConfirmDialog
          title="Bạn có chắc chắn muốn xóa biến này?"
          description="Điều này sẽ xóa biến khỏi ứng dụng và không thể hoàn tác."
          onConfirm={remove}
        >
          <Button
            size="sm"
            variant="ghost"
            className="space-x-2 flex items-center"
          >
            <div>Xóa</div>
          </Button>
        </ConfirmDialog>
      </CardFooter>
    </Card>
  );
}
