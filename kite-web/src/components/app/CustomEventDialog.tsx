import {
  useCustomEventCreateMutation,
  useCustomEventUpdateMutation,
} from "@/lib/api/mutations";
import { setValidationErrors } from "@/lib/form";
import { useAppId } from "@/lib/hooks/params";
import { CustomEvent } from "@/lib/types/wire.gen";
import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import LoadingButton from "../common/LoadingButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";

interface FormFields {
  name: string;
  description: string;
}

export default function CustomEventDialog({
  children,
  event,
}: {
  children: ReactNode;
  event?: CustomEvent;
}) {
  const [open, setOpen] = useState(false);
  const appId = useAppId();
  const createMutation = useCustomEventCreateMutation(appId);
  const updateMutation = useCustomEventUpdateMutation(appId, event?.id ?? "");
  const form = useForm<FormFields>({
    defaultValues: {
      name: event?.name ?? "",
      description: event?.description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: event?.name ?? "",
        description: event?.description ?? "",
      });
    }
  }, [event, form, open]);

  function onSubmit(values: FormFields) {
    const mutation = event ? updateMutation : createMutation;
    if (mutation.isPending) return;

    mutation.mutate(values, {
      onSuccess(response) {
        if (response.success) {
          toast.success(
            event ? "Đã cập nhật event key!" : "Đã đăng ký event key!"
          );
          setOpen(false);
          return;
        }
        if (response.error.code === "validation_failed") {
          setValidationErrors(form, response.error.data);
          return;
        }
        toast.error(
          `${event ? "Cập nhật" : "Đăng ký"} event thất bại: ${response.error.message} (${response.error.code})`
        );
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? "Chỉnh sửa event key" : "Đăng ký event key"}
          </DialogTitle>
          <DialogDescription>
            Flow phát và flow nhận sẽ cùng tham chiếu ID ổn định của event này.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event key</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono"
                      placeholder="shop.item_purchased"
                      pattern="[a-z][a-z0-9_]*(\.[a-z0-9_]+)*"
                      maxLength={128}
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    Chữ thường; dùng dấu chấm để chia namespace. Có thể sửa tên
                    sau mà không làm đứt liên kết giữa các flow.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <LoadingButton
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {event ? "Lưu thay đổi" : "Đăng ký event"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
