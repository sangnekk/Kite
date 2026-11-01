import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { z } from "zod"
import { FormSection, NumberField, SwitchField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useAdminMutation } from "@/hooks/useAdminMutation"
import { api, errorMessage } from "@/lib/api"
import type { Plan } from "@/lib/types"
import { PLANS_KEY } from "./api"

const MAX = 1_000_000_000
const count = (message = "Nhập một số nguyên từ 0") =>
  z.number({ error: "Nhập một số" }).int(message).min(0, message).max(MAX, "Quá lớn")
// -1 means unlimited for these limits.
const limitOrUnlimited = z
  .number({ error: "Nhập một số" })
  .int("Phải là số nguyên")
  .min(-1, "Dùng -1 cho không giới hạn")
  .max(MAX, "Quá lớn")

export const planSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,39}$/, "2–40 ký tự: chữ thường, số, - hoặc _"),
  title: z.string().trim().min(1, "Bắt buộc").max(100, "Tối đa 100 ký tự"),
  description: z.string().max(500, "Tối đa 500 ký tự"),
  price: z.number({ error: "Nhập một số" }).min(0, "Không được âm"),
  payment_amount: count(),
  premium_duration_days: z.number({ error: "Nhập một số" }).int("Phải là số nguyên").min(0, "Không được âm").max(3650, "Tối đa 3650 ngày"),
  default: z.boolean(),
  popular: z.boolean(),
  hidden: z.boolean(),
  discord_role_id: z.string(),
  feature_max_collaborators: count(),
  feature_usage_credits_per_month: count(),
  feature_max_guilds: count(),
  feature_max_commands: count(),
  feature_max_variables: count(),
  feature_max_messages: count(),
  feature_max_event_listeners: count(),
  feature_max_custom_tables: limitOrUnlimited,
  feature_max_custom_events: limitOrUnlimited,
  feature_max_schedules: limitOrUnlimited,
  feature_priority_support: z.boolean(),
  feature_custom_bot_status: z.boolean(),
  feature_ai_included: z.boolean(),
  feature_ai_credit_per_day: count(),
  feature_transcript_no_watermark: z.boolean(),
})

export type PlanFormValues = z.infer<typeof planSchema>

export const EMPTY_PLAN: PlanFormValues = {
  id: "",
  title: "",
  description: "",
  price: 0,
  payment_amount: 0,
  premium_duration_days: 30,
  default: false,
  popular: false,
  hidden: false,
  discord_role_id: "",
  feature_max_collaborators: 1,
  feature_usage_credits_per_month: 10000,
  feature_max_guilds: 100,
  feature_max_commands: 25,
  feature_max_variables: 25,
  feature_max_messages: 25,
  feature_max_event_listeners: 5,
  feature_max_custom_tables: 0,
  feature_max_custom_events: 0,
  feature_max_schedules: 0,
  feature_priority_support: false,
  feature_custom_bot_status: false,
  feature_ai_included: false,
  feature_ai_credit_per_day: 0,
  feature_transcript_no_watermark: false,
}

function toFormValues(plan: Plan): PlanFormValues {
  return planSchema.parse({ ...EMPTY_PLAN, ...plan })
}

/** Creates a plan (plan === null) or edits one. */
export function PlanFormSheet({
  open,
  plan,
  onOpenChange,
}: {
  open: boolean
  plan: Plan | null
  onOpenChange: (open: boolean) => void
}) {
  const editing = plan !== null
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: EMPTY_PLAN,
  })

  // Load the plan being edited (or a blank form) every time the sheet opens.
  useEffect(() => {
    if (open) {
      form.reset(plan ? toFormValues(plan) : EMPTY_PLAN)
      setServerError(null)
    }
  }, [open, plan, form])

  const save = useAdminMutation(
    (values: PlanFormValues) =>
      editing
        ? api<Plan>(`/plans/${plan.id}`, { method: "PUT", body: values })
        : api<Plan>("/plans", { method: "POST", body: values }),
    {
      invalidate: [PLANS_KEY],
      success: (saved) => (editing ? `Đã lưu gói “${saved.title}”` : `Đã tạo gói “${saved.title}”`),
      toastError: false,
    }
  )

  async function onSubmit(values: PlanFormValues) {
    setServerError(null)
    try {
      await save.mutateAsync(values)
      onOpenChange(false)
    } catch (err) {
      setServerError(errorMessage(err))
    }
  }

  const isDefault = plan?.default ?? false

  return (
    <Sheet open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? `Sửa gói “${plan.title}”` : "Thêm gói đăng ký"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Thay đổi áp dụng ngay cho mọi ứng dụng đang dùng gói này."
              : "Gói mới được thêm vào cuối danh sách và bán được ngay."}
          </SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
            <FormSection title="Thông tin">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  name="id"
                  label="Mã gói"
                  readOnly={editing}
                  className={editing ? "[&_input]:bg-muted" : undefined}
                  description={editing ? "Không thể đổi mã của gói đã tạo." : "Ví dụ: pro, student-2026"}
                />
                <TextField name="title" label="Tên hiển thị" />
                <TextField name="description" label="Mô tả" className="sm:col-span-2" />
              </div>
            </FormSection>

            <FormSection title="Giá và thời hạn">
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField name="price" label="Giá hiển thị (₫)" />
                <NumberField name="payment_amount" label="Số tiền thu (₫)" description="Số tiền khách chuyển khoản." />
                <NumberField name="premium_duration_days" label="Thời hạn (ngày)" description="0 = vĩnh viễn." />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SwitchField
                  name="default"
                  label="Gói mặc định"
                  disabled={isDefault}
                  description={isDefault ? "Đặt gói khác làm mặc định để đổi." : "Mọi ứng dụng đều được gói này."}
                />
                <SwitchField name="popular" label="Nổi bật" description="Gắn nhãn phổ biến." />
                <SwitchField name="hidden" label="Ẩn" description="Không hiện trên trang giá." />
              </div>
            </FormSection>

            <FormSection title="Giới hạn" description="Với bảng tùy chỉnh, sự kiện tùy chỉnh và lịch: nhập -1 để không giới hạn.">
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField name="feature_max_collaborators" label="Cộng tác viên" />
                <NumberField name="feature_max_guilds" label="Máy chủ Discord" />
                <NumberField name="feature_usage_credits_per_month" label="Credits mỗi tháng" />
                <NumberField name="feature_max_commands" label="Lệnh" />
                <NumberField name="feature_max_variables" label="Biến" />
                <NumberField name="feature_max_messages" label="Tin nhắn" />
                <NumberField name="feature_max_event_listeners" label="Trình lắng nghe sự kiện" />
                <NumberField name="feature_max_custom_tables" label="Bảng tùy chỉnh" />
                <NumberField name="feature_max_custom_events" label="Sự kiện tùy chỉnh" />
                <NumberField name="feature_max_schedules" label="Lịch chạy" />
              </div>
            </FormSection>

            <FormSection title="Tính năng">
              <div className="grid gap-3 sm:grid-cols-2">
                <SwitchField name="feature_priority_support" label="Hỗ trợ ưu tiên" />
                <SwitchField name="feature_custom_bot_status" label="Tùy chỉnh trạng thái bot" />
                <SwitchField name="feature_ai_included" label="Có AI" />
                <NumberField name="feature_ai_credit_per_day" label="Credits AI mỗi ngày" />
                <SwitchField name="feature_transcript_no_watermark" label="Ẩn watermark transcript" />
              </div>
            </FormSection>

            <FormSection title="Discord" description="Tùy chọn.">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  name="discord_role_id"
                  label="ID vai trò Discord"
                  description="Người đang dùng gói này được bot cấp vai trò đó trong máy chủ hỗ trợ."
                />
              </div>
            </FormSection>

            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}
          </form>
        </FormProvider>

        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="plan-form" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {editing ? "Lưu thay đổi" : "Tạo gói"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
