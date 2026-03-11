import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStatusUpdateMutation } from "@/lib/api/mutations";
import { setValidationErrors } from "@/lib/form";
import { useApp } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface FormFields {
  discord_status: {
    status: string;
    activity_type?: string;
    activity_name?: string;
    activity_url?: string;
  };
}

export default function AppSettingsPresence() {
  const app = useApp();

  const form = useForm<FormFields>({
    defaultValues: {
      discord_status: {
        status: "",
        activity_type: "0",
        activity_name: "",
        activity_url: "",
      },
    },
  });

  useEffect(() => {
    if (app) {
      form.reset({
        discord_status: {
          status: app.discord_status?.status || "",
          activity_type: app.discord_status?.activity_type?.toString() || "0",
          activity_name: app.discord_status?.activity_name || "",
          activity_url: app.discord_status?.activity_url || "",
        },
      });
    }
  }, [app, form]);

  const updateMutation = useAppStatusUpdateMutation(useAppId());

  const onSubmit = useCallback(
    (data: FormFields) => {
      updateMutation.mutate(
        {
          discord_status: !!data.discord_status.status
            ? {
                status: data.discord_status.status,
                activity_type:
                  parseInt(data.discord_status.activity_type || "0") ||
                  undefined,
                activity_name: data.discord_status.activity_name || undefined,
                activity_state: data.discord_status.activity_name || undefined,
                activity_url: data.discord_status.activity_url || undefined,
              }
            : undefined,
        },
        {
          onSuccess(res) {
            if (res.success) {
              toast.success(
                "Đã cập nhật trạng thái! Có thể mất vài phút để có hiệu lực."
              );
            } else {
              if (res.error.code === "validation_failed") {
                setValidationErrors(form, res.error.data);
              } else {
                toast.error(
                  `Cập nhật ứng dụng thất bại: ${res.error.message} (${res.error.code})`
                );
              }
            }
          },
        }
      );
    },
    [form, updateMutation]
  );

  const discordStatus = form.watch("discord_status.status");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái tùy chỉnh</CardTitle>
        <CardDescription>
          Cấu hình trạng thái và hoạt động của ứng dụng trên Discord.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <CardContent className="space-y-5">
            <div className="flex space-x-3 items-end">
              <FormField
                control={form.control}
                name="discord_status.status"
                render={({ field }) => (
                  <FormItem className="min-w-48">
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái tùy chỉnh" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="online">Trực tuyến</SelectItem>
                        <SelectItem value="dnd">Không làm phiền</SelectItem>
                        <SelectItem value="idle">Vắng mặt</SelectItem>
                        <SelectItem value="invisible">Ẩn</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => form.setValue("discord_status.status", "")}
              >
                Xóa
              </Button>
            </div>
            {discordStatus && (
              <>
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="discord_status.activity_type"
                    render={({ field }) => (
                      <FormItem className="min-w-48">
                        <FormLabel>Loại hoạt động</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn loại hoạt động cho ứng dụng" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Đang chơi</SelectItem>
                            <SelectItem value="1">Đang stream</SelectItem>
                            <SelectItem value="2">Đang nghe</SelectItem>
                            <SelectItem value="3">Đang xem</SelectItem>
                            <SelectItem value="5">Đang thi đấu</SelectItem>
                            <SelectItem value="4">Tùy chỉnh</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discord_status.activity_name"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Tên hoạt động</FormLabel>
                        <FormControl>
                          <Input type="text" className="w-full" {...field} />
                        </FormControl>
                        <FormMessage />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="discord_status.activity_url"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>URL hoạt động</FormLabel>
                      <FormControl>
                        <Input type="url" className="w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap border-t px-6 py-4 gap-3">
            <Button type="submit">Cập nhật trạng thái</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
