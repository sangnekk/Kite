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
import { useApp, useAppFeature } from "@/lib/hooks/api";
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
    activity_details?: string;
    activity_large_image?: string;
    activity_large_text?: string;
    activity_small_image?: string;
    activity_small_text?: string;
  };
}

export default function AppSettingsPresence() {
  const app = useApp();
  const appId = useAppId();
  const canCustomStatus = useAppFeature((f) => f.custom_bot_status);

  const form = useForm<FormFields>({
    defaultValues: {
      discord_status: {
        status: "",
        activity_type: "0",
        activity_name: "",
        activity_url: "",
        activity_details: "",
        activity_large_image: "",
        activity_large_text: "",
        activity_small_image: "",
        activity_small_text: "",
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
          activity_details: app.discord_status?.activity_details || "",
          activity_large_image: app.discord_status?.activity_large_image || "",
          activity_large_text: app.discord_status?.activity_large_text || "",
          activity_small_image: app.discord_status?.activity_small_image || "",
          activity_small_text: app.discord_status?.activity_small_text || "",
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
                activity_details:
                  data.discord_status.activity_details || undefined,
                activity_large_image:
                  data.discord_status.activity_large_image || undefined,
                activity_large_text:
                  data.discord_status.activity_large_text || undefined,
                activity_small_image:
                  data.discord_status.activity_small_image || undefined,
                activity_small_text:
                  data.discord_status.activity_small_text || undefined,
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
      {canCustomStatus === false ? (
        <>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tính năng đổi trạng thái bot chỉ khả dụng ở các gói có bật tính
              năng này.
            </p>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button asChild>
              <Link
                href={{
                  pathname: "/apps/[appId]/premium",
                  query: { appId },
                }}
              >
                Nâng cấp gói
              </Link>
            </Button>
          </CardFooter>
        </>
      ) : (
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
                <FormField
                  control={form.control}
                  name="discord_status.activity_details"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Chi tiết (dòng phụ)</FormLabel>
                      <FormControl>
                        <Input type="text" className="w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  Ảnh: dán link ảnh trực tiếp (.png, .jpg, .gif, .webp). Kite sẽ
                  tự chuyển sang định dạng Discord khi áp dụng.
                </p>
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="discord_status.activity_large_image"
                    rules={{
                      validate: (v) =>
                        !v ||
                        /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(
                          v
                        ) ||
                        "Phải là link ảnh trực tiếp (.png, .jpg, .gif, .webp)",
                    }}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Ảnh lớn (URL)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="https://.../anh.png"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discord_status.activity_large_text"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Text hover ảnh lớn</FormLabel>
                        <FormControl>
                          <Input type="text" className="w-full" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="discord_status.activity_small_image"
                    rules={{
                      validate: (v) =>
                        !v ||
                        /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(
                          v
                        ) ||
                        "Phải là link ảnh trực tiếp (.png, .jpg, .gif, .webp)",
                    }}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Ảnh nhỏ (URL)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="https://.../anh.png"
                            className="w-full"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discord_status.activity_small_text"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Text hover ảnh nhỏ</FormLabel>
                        <FormControl>
                          <Input type="text" className="w-full" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap border-t px-6 py-4 gap-3">
            <Button type="submit">Cập nhật trạng thái</Button>
          </CardFooter>
        </form>
        </Form>
      )}
    </Card>
  );
}
