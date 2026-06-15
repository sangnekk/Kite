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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCommandCreateMutation } from "@/lib/api/mutations";
import { toast } from "sonner";
import LoadingButton from "../common/LoadingButton";
import { useAppId } from "@/lib/hooks/params";
import { getUniqueId } from "@/lib/utils";
import { useRouter } from "next/router";
import { setValidationErrors } from "@/lib/form";
import { getNodeId } from "@/lib/flow/nodes";

interface FormFields {
  name: string;
  description: string;
  slash: boolean;
  prefix: boolean;
}

export default function CommandCreateDialog({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const appId = useAppId();

  const createMutation = useCommandCreateMutation(appId);
  const form = useForm<FormFields>({
    defaultValues: {
      name: "",
      description: "",
      slash: true,
      prefix: false,
    },
  });

  function onSubmit(data: FormFields) {
    if (createMutation.isPending) return;

    if (!data.slash && !data.prefix) {
      toast.error("Chọn ít nhất một loại: Slash hoặc Prefix.");
      return;
    }

    createMutation.mutate(
      {
        flow_source: getInitialFlowData(
          data.name,
          data.description,
          data.slash,
          data.prefix
        ),
        enabled: true,
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã tạo lệnh!");
            setOpen(false);

            setTimeout(
              () =>
                router.push({
                  pathname: "/apps/[appId]/commands/[cmdId]",
                  query: { appId, cmdId: res.data.id },
                }),
              500
            );
          } else {
            if (res.error.code === "validation_failed") {
              setValidationErrors(form, res.error.data, {
                "flow_source.nodes.0.name": "name",
                "flow_source.nodes.0.description": "description",
              });
            } else {
              toast.error(
                `Tạo lệnh thất bại: ${res.error.message} (${res.error.code})`
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
          <DialogTitle>Tạo lệnh</DialogTitle>
          <DialogDescription>
            Tạo lệnh mới với tên và mô tả.
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
            <div className="space-y-2">
              <FormLabel>Loại lệnh</FormLabel>
              <FormField
                control={form.control}
                name="slash"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Slash command (<span className="font-mono">/tên</span>)
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Prefix / mention (<span className="font-mono">@bot tên</span>{" "}
                      hoặc <span className="font-mono">!tên</span>)
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <LoadingButton type="submit" loading={createMutation.isPending}>
                Tạo lệnh
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getInitialFlowData(
  name: string,
  description: string,
  slash: boolean,
  prefix: boolean
) {
  return {
    nodes: [
      {
        id: getNodeId(),
        position: { x: 0, y: 0 },
        data: {
          name,
          description,
          command_disable_slash: !slash || undefined,
          command_enable_prefix: prefix || undefined,
        },
        type: "entry_command",
      },
    ],
    edges: [],
  };
}
