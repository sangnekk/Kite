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

interface FormFields {
  name: string;
  description: string;
}

const createDefaultMessage = (name: string) => ({
  content: `Mẫu tin nhắn của bạn: **${name}**`,
  tts: false,
  embeds: [
    {
      id: 174831423,
      description:
        "Bạn có thể sử dụng mẫu tin nhắn để tạo tin nhắn Discord chứa nhúng (embed) và thành phần tương tác. Chúng có thể được dùng để tạo tin nhắn độc lập hoặc làm phản hồi cho lệnh hoặc các sự kiện khác.",
      color: 16735232,
      author: {
        name: "Về mẫu tin nhắn",
      },
      thumbnail: {
        url: "https://kite.onl/logo.png",
      },
      fields: [],
    },
  ],
  components: [],
  actions: {},
});

export default function MessageCreateDialog({
  children,
  onMessageCreated,
}: {
  children: ReactNode;
  onMessageCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const appId = useAppId();

  const createMutation = useMessageCreateMutation(appId);
  const form = useForm<FormFields>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  function onSubmit(data: FormFields) {
    if (createMutation.isPending) return;

    createMutation.mutate(
      {
        name: data.name,
        description: data.description || null,
        data: createDefaultMessage(data.name),
        flow_sources: {},
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã tạo tin nhắn!");
            setOpen(false);

            if (onMessageCreated) {
              onMessageCreated(res.data.id);
            }
          } else {
            if (res.error.code === "validation_failed") {
              setValidationErrors(form, res.error.data);
            } else {
              toast.error(
                `Tạo tin nhắn thất bại: ${res.error.message} (${res.error.code})`
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
          <DialogTitle>Tạo tin nhắn</DialogTitle>
          <DialogDescription>
            Tạo tin nhắn có thể gửi và sử dụng làm phản hồi trong ứng dụng.
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
                Tạo tin nhắn
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
