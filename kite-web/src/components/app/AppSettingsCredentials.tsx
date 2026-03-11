import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppTokenUpdateMutation } from "@/lib/api/mutations";
import { setValidationErrors } from "@/lib/form";
import { useApp } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
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

interface FormFields {
  discord_token: string;
}

export default function AppSettingsCredentials() {
  const app = useApp();

  const form = useForm<FormFields>({
    defaultValues: {
      discord_token: "",
    },
  });

  useEffect(() => {
    if (app) {
      form.reset({
        discord_token: "",
      });
    }
  }, [app, form]);

  const updateMutation = useAppTokenUpdateMutation(useAppId());

  const onSubmit = useCallback(
    (data: FormFields) => {
      if (!data.discord_token) return;

      updateMutation.mutate(
        {
          discord_token: data.discord_token,
        },
        {
          onSuccess(res) {
            if (res.success) {
              toast.success("Đã lưu cài đặt!");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin xác thực</CardTitle>
        <CardDescription>
          Cấu hình thông tin xác thực của ứng dụng. Đây là nơi bạn có thể
          thay đổi token Discord của ứng dụng.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="discord_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Discord</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={!form.getValues().discord_token}>
              Lưu token
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
