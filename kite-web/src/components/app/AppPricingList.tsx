import {
  ArrowRightIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  HeadphonesIcon,
  MinusIcon,
  RadioTowerIcon,
  SparklesIcon,
  UsersIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useAppSubscriptions,
  useBillingCheckoutStatus,
  useBillingPlans,
} from "@/lib/hooks/api";
import { useBillingCheckout } from "@/lib/hooks/lemonsqueezy";
import { useAppId } from "@/lib/hooks/params";
import { BillingCheckoutResponse, BillingPlan } from "@/lib/types/wire.gen";
import { cn, formatBillingPeriod, formatNumber } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";

type Pricing = BillingPlan & { current?: boolean };

export default function AppPricingList() {
  const appId = useAppId();
  const queryClient = useQueryClient();
  const subscriptions = useAppSubscriptions();
  const plans = useBillingPlans();
  const checkout = useBillingCheckout();
  const [activeCheckout, setActiveCheckout] = useState<{
    planId: string;
    checkout: BillingCheckoutResponse;
  } | null>(null);

  const activeSubscriptions = subscriptions?.filter(
    (subscription) => subscription!.status !== "expired",
  );

  // Plans cannot stack: an app must finish or end its current plan first.
  const hasActivePlan = (activeSubscriptions?.length ?? 0) > 0;

  const pricings = useMemo<Pricing[]>(() => {
    return (
      plans
        ?.filter((plan): plan is BillingPlan => Boolean(plan && !plan.hidden))
        .map((plan) => ({
          ...plan,
          current: activeSubscriptions?.some(
            (subscription) => subscription!.plan_id === plan.id,
          ),
        })) ?? []
    );
  }, [activeSubscriptions, plans]);

  const featuredPlanId = useMemo(
    () =>
      pricings.find((pricing) => pricing.popular)?.id ??
      pricings.find((pricing) => pricing.price > 0)?.id,
    [pricings],
  );

  const checkoutStatus = useBillingCheckoutStatus(
    activeCheckout?.checkout.payment_id ?? "",
    activeCheckout?.planId ?? "",
  );

  useEffect(() => {
    if (checkoutStatus?.paid && activeCheckout) {
      toast.success("Thanh toán thành công");
      queryClient.invalidateQueries({
        queryKey: ["apps", appId, "billing", "subscriptions"],
      });
      setActiveCheckout(null);
    }
  }, [activeCheckout, appId, checkoutStatus?.paid, queryClient]);

  return (
    <>
      {activeCheckout ? (
        <CheckoutCard
          checkout={activeCheckout.checkout}
          paid={Boolean(checkoutStatus?.paid)}
        />
      ) : null}

      <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-2">
        {pricings.map((pricing) => {
          const isCurrent =
            Boolean(pricing.current) || (pricing.default && !hasActivePlan);
          const isFeatured = pricing.id === featuredPlanId;
          const canCheckout = !isCurrent && pricing.price > 0 && !hasActivePlan;

          return (
            <PricingCard
              key={pricing.id}
              pricing={pricing}
              isCurrent={isCurrent}
              isFeatured={isFeatured}
              hasActivePlan={hasActivePlan}
              onCheckout={() =>
                checkout(pricing.id, (data) => {
                  setActiveCheckout({ planId: pricing.id, checkout: data });
                })
              }
              canCheckout={canCheckout}
            />
          );
        })}
      </div>

      {plans && pricings.length === 0 ? (
        <Card className="mx-auto max-w-2xl border-dashed text-center">
          <CardHeader>
            <CardTitle className="text-lg">Chưa có gói khả dụng</CardTitle>
            <CardDescription>
              Các gói dành cho ứng dụng này đang được cập nhật. Vui lòng quay
              lại sau.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </>
  );
}

function PricingCard({
  pricing,
  isCurrent,
  isFeatured,
  hasActivePlan,
  canCheckout,
  onCheckout,
}: {
  pricing: Pricing;
  isCurrent: boolean;
  isFeatured: boolean;
  hasActivePlan: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
}) {
  const buttonLabel = isCurrent
    ? "Gói hiện tại"
    : hasActivePlan
      ? "Đang dùng gói khác"
      : pricing.price <= 0
        ? "Gói mặc định"
        : "Chọn gói này";

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
        isFeatured &&
          "border-primary/50 shadow-lg shadow-primary/5 lg:-translate-y-1",
      )}
    >
      <div
        aria-hidden="true"
        className={cn("h-1 w-full bg-border", isFeatured && "bg-primary")}
      />

      <CardHeader className="gap-4 pb-5">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl sm:text-2xl">{pricing.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {isCurrent ? <Badge variant="secondary">Đang sử dụng</Badge> : null}
            {isFeatured ? (
              <Badge className="gap-1">
                <SparklesIcon data-icon="inline-start" className="size-3" />
                Đề xuất
              </Badge>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline gap-x-1">
            <span className="text-4xl font-bold tracking-tight">
              {formatNumber(pricing.price)}đ
            </span>
            <span className="text-sm text-muted-foreground">
              {formatBillingPeriod(pricing.premium_duration_days)}
            </span>
          </div>
          <CardDescription className="mt-3 min-h-10 leading-5">
            {pricing.description ||
              "Dung lượng linh hoạt cho ứng dụng của bạn."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="grid grid-cols-2 gap-2.5">
          <PlanMetric
            icon={ZapIcon}
            value={formatMetric(pricing.feature_usage_credits_per_month)}
            label="Credit / tháng"
          />
          <PlanMetric
            icon={BotIcon}
            value={formatMetric(pricing.feature_max_guilds)}
            label="Server"
          />
          <PlanMetric
            icon={UsersIcon}
            value={formatMetric(pricing.feature_max_collaborators)}
            label="Cộng tác viên"
          />
          <PlanMetric
            icon={WorkflowIcon}
            value={formatMetric(pricing.feature_max_commands)}
            label="Lệnh & biến"
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-3.5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Khả năng đi kèm
          </p>
          <PlanFeature
            icon={DatabaseIcon}
            {...formatLimitFeature(
              pricing.feature_max_custom_tables,
              "bảng dữ liệu",
            )}
          />
          <PlanFeature
            icon={RadioTowerIcon}
            {...formatLimitFeature(
              pricing.feature_max_custom_events,
              "sự kiện nội bộ",
            )}
          />
          <PlanFeature
            icon={WorkflowIcon}
            {...formatLimitFeature(
              pricing.feature_max_event_listeners,
              "bộ lắng nghe sự kiện",
            )}
          />
          <PlanFeature
            icon={HeadphonesIcon}
            label={
              pricing.feature_priority_support
                ? "Hỗ trợ ưu tiên"
                : "Hỗ trợ cộng đồng"
            }
            included
          />
          {pricing.feature_custom_bot_status ? (
            <PlanFeature
              icon={BotIcon}
              label="Trạng thái bot tùy chỉnh"
              included
            />
          ) : null}
          {pricing.feature_ai_included ? (
            <PlanFeature
              icon={SparklesIcon}
              label={`Trợ lý AI · ${formatMetric(
                pricing.feature_ai_credit_per_day,
              )} credit / ngày`}
              description="Làm mới mỗi ngày, không cộng dồn"
              included
            />
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          className="w-full gap-2"
          size="lg"
          disabled={!canCheckout}
          variant={isFeatured && canCheckout ? "default" : "outline"}
          onClick={onCheckout}
        >
          {isCurrent ? (
            <CheckIcon data-icon="inline-start" className="size-4" />
          ) : canCheckout ? (
            <ArrowRightIcon data-icon="inline-start" className="size-4" />
          ) : null}
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

function PlanMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ZapIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        <span className="truncate text-xs">{label}</span>
      </div>
      <p className="mt-2 truncate text-base font-semibold sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function PlanFeature({
  icon: Icon,
  label,
  description,
  included,
}: {
  icon: typeof DatabaseIcon;
  label: string;
  description?: string;
  included: boolean;
}) {
  return (
    <div className={cn("flex gap-3", !included && "text-muted-foreground")}>
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          included && "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium leading-5">
          {included ? (
            <CheckIcon className="size-3.5 shrink-0 text-primary" />
          ) : (
            <MinusIcon className="size-3.5 shrink-0" />
          )}
          <span>{label}</span>
        </p>
        {description ? (
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CheckoutCard({
  checkout,
  paid,
}: {
  checkout: BillingCheckoutResponse;
  paid: boolean;
}) {
  return (
    <Card className="mx-auto mb-8 max-w-5xl overflow-hidden border-primary/30 bg-gradient-to-br from-card to-muted/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl sm:text-2xl">
            Quét QR để thanh toán
          </CardTitle>
          <Badge variant={paid ? "default" : "secondary"}>
            {paid ? "Đã thanh toán" : "Đang chờ xác nhận"}
          </Badge>
        </div>
        <CardDescription>
          Chuyển khoản đúng số tiền và nội dung để hệ thống tự xác nhận.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="mx-auto rounded-2xl bg-white p-3 shadow-lg shadow-black/10 ring-1 ring-black/5 lg:mx-0">
          <img
            src={checkout.qr_code_url}
            alt="Mã QR thanh toán SePay"
            className="size-56 rounded-xl object-contain sm:size-64"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentDetail label="Ngân hàng" value={checkout.bank_name} />
            <PaymentDetail
              label="Số tiền"
              value={`${formatNumber(checkout.amount)}đ`}
              emphasized
            />
          </div>

          <CopyablePaymentDetail
            label="Số tài khoản"
            value={checkout.account_number}
            successMessage="Đã sao chép số tài khoản"
          />
          <CopyablePaymentDetail
            label="Nội dung chuyển khoản"
            value={checkout.payment_content}
            successMessage="Đã sao chép nội dung chuyển khoản"
          />

          <div className="rounded-xl border bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <p className="mt-1 font-medium">
              {paid
                ? "Hệ thống đã ghi nhận thanh toán"
                : "Đang chờ SePay xác nhận giao dịch"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentDetail({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-medium", emphasized && "text-xl font-bold")}>
        {value}
      </p>
    </div>
  );
}

function CopyablePaymentDetail({
  label,
  value,
  successMessage,
}: {
  label: string;
  value: string;
  successMessage: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0 px-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-all font-mono text-sm font-medium">{value}</p>
      </div>
      <Button
        className="mt-3 w-full gap-2 sm:mt-0 sm:w-auto"
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          toast.success(successMessage);
        }}
      >
        <CopyIcon data-icon="inline-start" className="size-3.5" />
        Sao chép
      </Button>
    </div>
  );
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function formatMetric(value: unknown): string {
  const normalized = normalizeLimit(value);
  if (normalized === -1) return "Không giới hạn";
  return formatNumber(Math.max(0, normalized));
}

function formatLimitFeature(
  value: unknown,
  unit: string,
): { label: string; included: boolean } {
  const normalized = normalizeLimit(value);

  if (normalized === -1) {
    return {
      label: `Không giới hạn ${unit}`,
      included: true,
    };
  }

  if (normalized <= 0) {
    return {
      label: `Không bao gồm ${unit}`,
      included: false,
    };
  }

  return {
    label: `${formatNumber(normalized)} ${unit}`,
    included: true,
  };
}
