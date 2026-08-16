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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { useScheduleCreateMutation } from "@/lib/api/mutations";
import { toast } from "sonner";
import LoadingButton from "../common/LoadingButton";
import { useAppId } from "@/lib/hooks/params";
import { useRouter } from "next/router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getNodeId } from "@/lib/flow/nodes";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

interface FormFields {
  description: string;
  schedule_type: "interval" | "daily" | "weekly" | "cron";
  interval_value: number;
  interval_unit: "minutes" | "hours";
  time: string;
  cron_expression: string;
  timezone: string;
}

export default function ScheduleCreateDialog({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1]);

  const router = useRouter();
  const appId = useAppId();

  const createMutation = useScheduleCreateMutation(appId);
  const form = useForm<FormFields>({
    defaultValues: {
      description: "",
      schedule_type: "interval",
      interval_value: 30,
      interval_unit: "minutes",
      time: "08:00",
      cron_expression: "0 8 * * *",
      timezone: "Asia/Ho_Chi_Minh",
    },
  });

  const scheduleType = form.watch("schedule_type");

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function onSubmit(data: FormFields) {
    if (createMutation.isPending) return;

    if (data.schedule_type === "weekly" && weekdays.length === 0) {
      toast.error("Chọn ít nhất một ngày trong tuần");
      return;
    }

    const nodeData: Record<string, unknown> = {
      description: data.description,
      schedule_type: data.schedule_type,
      schedule_timezone: data.timezone,
    };

    if (data.schedule_type === "interval") {
      const multiplier = data.interval_unit === "hours" ? 3600 : 60;
      nodeData.schedule_interval_seconds = Number(data.interval_value) * multiplier;
    } else if (data.schedule_type === "daily") {
      nodeData.schedule_time = data.time;
    } else if (data.schedule_type === "weekly") {
      nodeData.schedule_time = data.time;
      nodeData.schedule_weekdays = weekdays;
    } else if (data.schedule_type === "cron") {
      nodeData.schedule_cron_expression = data.cron_expression;
    }

    createMutation.mutate(
      {
        flow_source: {
          nodes: [
            {
              id: getNodeId(),
              position: { x: 0, y: 0 },
              data: nodeData,
              type: "entry_schedule",
            },
          ],
          edges: [],
        } as any,
        enabled: true,
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã tạo lịch biểu!");
            setOpen(false);

            setTimeout(
              () =>
                router.push({
                  pathname: "/apps/[appId]/schedules/[scheduleId]",
                  query: { appId, scheduleId: res.data.id },
                }),
              500
            );
          } else {
            toast.error(
              `Tạo lịch biểu thất bại: ${res.error.message} (${res.error.code})`
            );
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
          <DialogTitle>Tạo lịch biểu</DialogTitle>
          <DialogDescription>
            Chạy một luồng theo lịch định kỳ mà không cần sự kiện.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="description"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormDescription>
                    Lịch biểu này dùng để làm gì?
                  </FormDescription>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schedule_type"
              render={({ field }) => (
                <FormItem className="min-w-48">
                  <FormLabel>Kiểu lịch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn kiểu lịch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="interval">Theo chu kỳ</SelectItem>
                      <SelectItem value="daily">Hằng ngày</SelectItem>
                      <SelectItem value="weekly">Hằng tuần</SelectItem>
                      <SelectItem value="cron">Cron tùy chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scheduleType === "interval" && (
              <div className="flex gap-2 items-end">
                <FormField
                  control={form.control}
                  name="interval_value"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Mỗi</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interval_unit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minutes">phút</SelectItem>
                          <SelectItem value="hours">giờ</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(scheduleType === "daily" || scheduleType === "weekly") && (
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời điểm (HH:MM)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {scheduleType === "weekly" && (
              <FormItem>
                <FormLabel>Các ngày trong tuần</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      size="sm"
                      variant={
                        weekdays.includes(d.value) ? "default" : "outline"
                      }
                      className={cn("w-11")}
                      onClick={() => toggleWeekday(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}

            {scheduleType === "cron" && (
              <FormField
                control={form.control}
                name="cron_expression"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cron expression</FormLabel>
                    <FormDescription>
                      Định dạng chuẩn 5 trường: phút giờ ngày tháng thứ.
                    </FormDescription>
                    <FormControl>
                      <Input type="text" placeholder="0 8 * * *" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {scheduleType !== "interval" && (
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Múi giờ</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <LoadingButton type="submit" loading={createMutation.isPending}>
                Tạo lịch biểu
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
