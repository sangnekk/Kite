import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ReactNode, useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { setValidationErrors } from "@/lib/form";
import LoadingButton from "../common/LoadingButton";
import { useAppId } from "@/lib/hooks/params";
import { useMessageCreateMutation } from "@/lib/api/mutations";
import { Message } from "@/lib/types/wire.gen";

interface FormFields {
  name: string;
  description: string;
}

export default function MessageCreateDialog({
  children,
  message,
  onMessageCreated,
}: {
  children: ReactNode;
  message: Message;
  onMessageCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const appId = useAppId();

  const createMutation = useMessageCreateMutation(appId);
  const form = useForm<FormFields>({
    defaultValues: {
      name: message.name,
      description: message.description || undefined,
    },
  });

  function onSubmit(data: FormFields) {
    if (createMutation.isPending) return;

    createMutation.mutate(
      {
        name: data.name,
        description: data.description || null,
        data: message.data,
        flow_sources: {},
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã nhân đôi tin nhắn!");
            setOpen(false);

            if (onMessageCreated) {
              onMessageCreated(res.data.id);
            }
          } else {
            if (res.error.code === "validation_failed") {
              setValidationErrors(form, res.error.data);
            } else {
              toast.error(
                `Nhân đôi tin nhắn thất bại: ${res.error.message} (${res.error.code})`
              );
            }
          }
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nhân đôi tin nhắn</DialogTitle>
          <DialogDescription>
            Nhân đôi tin nhắn hiện có với tên và mô tả mới.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
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
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <LoadingButton type="submit" loading={createMutation.isPending}>
                Nhân đôi tin nhắn
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
