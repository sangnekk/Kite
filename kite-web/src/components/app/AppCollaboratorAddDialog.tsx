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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAppCollaboratorCreateMutation } from "@/lib/api/mutations";
import { toast } from "sonner";
import { setValidationErrors } from "@/lib/form";
import LoadingButton from "../common/LoadingButton";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { useAppId } from "@/lib/hooks/params";

interface FormFields {
  discord_user_id: string;
  role: string;
}

export default function AppCollaboratorAddDialog({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const appId = useAppId();
  const createMutation = useAppCollaboratorCreateMutation(appId);

  const form = useForm<FormFields>({
    defaultValues: {
      discord_user_id: "",
      role: "admin",
    },
  });

  function onSubmit(data: FormFields) {
    if (createMutation.isPending) return;

    createMutation.mutate(data, {
      onSuccess(res) {
        if (res.success) {
          toast.success("Đã thêm cộng tác viên!");
          setOpen(false);
        } else {
          if (res.error.code === "validation_failed") {
            setValidationErrors(form, res.error.data);
          } else if (res.error.code === "unknown_user") {
            toast.error("Không thể thêm cộng tác viên", {
              description:
                "Kiểm tra lại ID Discord hoặc yêu cầu người này đăng nhập Kite ít nhất một lần.",
            });
          } else {
            toast.error(
              `Thêm cộng tác viên thất bại: ${res.error.message} (${res.error.code})`,
            );
          }
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm cộng tác viên</DialogTitle>
          <DialogDescription>
            Thêm cộng tác viên mới vào ứng dụng để họ có thể quản lý nó.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="discord_user_id"
              rules={{
                required: "Vui lòng nhập ID người dùng Discord",
                pattern: {
                  value: /^\d{17,20}$/,
                  message: "ID Discord phải gồm từ 17 đến 20 chữ số",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID người dùng Discord</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={20}
                      placeholder="Ví dụ: 867040792463802389"
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, ""))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Accordion type="single" collapsible>
              <AccordionItem
                value="discord-id-guide"
                className="rounded-lg border px-3"
              >
                <AccordionTrigger className="py-3 text-sm hover:no-underline">
                  Cách lấy ID người dùng Discord
                </AccordionTrigger>
                <AccordionContent>
                  <Tabs defaultValue="desktop">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="desktop" className="gap-2">
                        <MonitorIcon className="size-4" />
                        Máy tính
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="gap-2">
                        <SmartphoneIcon className="size-4" />
                        Điện thoại
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="desktop" className="mt-3">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">
                        Nhấp chuột phải vào người dùng, sau đó chọn
                        <span className="font-medium text-foreground">
                          {" "}
                          Sao chép ID Người Dùng
                        </span>
                        .
                      </p>
                      <img
                        src="/guides/discord-copy-user-id-desktop.png"
                        alt="Cách sao chép ID người dùng Discord trên máy tính"
                        width={924}
                        height={712}
                        className="h-auto w-full rounded-xl border object-contain"
                      />
                    </TabsContent>

                    <TabsContent value="mobile" className="mt-3">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">
                        Mở hồ sơ người dùng, nhấn menu ở góc phải rồi chọn
                        <span className="font-medium text-foreground">
                          {" "}
                          Sao chép ID Người Dùng
                        </span>
                        .
                      </p>
                      <img
                        src="/guides/discord-copy-user-id-mobile.png"
                        alt="Cách sao chép ID người dùng Discord trên điện thoại"
                        width={332}
                        height={713}
                        className="mx-auto h-auto max-h-[55dvh] w-auto max-w-full rounded-xl border object-contain"
                      />
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <DialogFooter>
              <LoadingButton type="submit" loading={createMutation.isPending}>
                Thêm cộng tác viên
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
