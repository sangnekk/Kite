import { CheckIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  useAppSubscriptions,
  useBillingPlans,
  useBillingCheckoutStatus,
} from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useEffect, useMemo, useState } from "react";
import { useBillingCheckout } from "@/lib/hooks/lemonsqueezy";
import { BillingCheckoutResponse } from "@/lib/types/wire.gen";
import { formatBillingPeriod, formatNumber } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AppPricingList() {
  const appId = useAppId();
  const queryClient = useQueryClient();
  const subscriptions = useAppSubscriptions();
  const [activeCheckout, setActiveCheckout] = useState<{
    planId: string;
    checkout: BillingCheckoutResponse;
  } | null>(null);

  const activeSubscriptions = subscriptions?.filter(
    (subscription) => subscription!.status !== "expired"
  );

  // Safety first: while the bot already has any active plan (paid or manually
  // granted), block buying another so plans never stack.
  const hasActivePlan = (activeSubscriptions?.length ?? 0) > 0;

  const plans = useBillingPlans();

  const pricings = useMemo(() => {
    return (
      plans
        ?.filter((plan) => !plan!.hidden)
        .map((plan) => {
          return {
            ...plan!,
            current: activeSubscriptions?.some(
              (subscription) => subscription!.plan_id === plan!.id
            ),
          };
        }) ?? []
    );
  }, [activeSubscriptions, plans]);

  const checkout = useBillingCheckout();

  const checkoutStatus = useBillingCheckoutStatus(
    activeCheckout?.checkout.payment_id ?? "",
    activeCheckout?.planId ?? ""
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
        <Card className="mb-8 border-primary/30 bg-gradient-to-br from-background to-muted/30 xl:mx-16">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-4">
              <span>Quét QR để thanh toán</span>
              <Badge variant="secondary">
                {checkoutStatus?.paid ? "Đã thanh toán" : "Đang chờ"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Chuyển khoản đúng số tiền và nội dung để hệ thống tự xác nhận.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="rounded-3xl bg-white p-4 shadow-lg shadow-black/10 ring-1 ring-black/5">
              <img
                src={activeCheckout.checkout.qr_code_url}
                alt="QR thanh toán SePay"
                className="h-64 w-64 rounded-2xl object-contain"
              />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Tên ngân hàng</div>
                <div className="font-medium">
                  {activeCheckout.checkout.bank_name}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Số tài khoản</div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border bg-muted/40 px-4 py-3 font-mono text-sm break-all">
                    {activeCheckout.checkout.account_number}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        activeCheckout.checkout.account_number
                      );
                      toast.success("Đã sao chép số tài khoản");
                    }}
                  >
                    Sao chép
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Số tiền</div>
                <div className="text-3xl font-bold">
                  {formatNumber(activeCheckout.checkout.amount)}đ
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Nội dung chuyển khoản</div>
                <div className="rounded-xl border bg-muted/40 px-4 py-3 font-mono text-sm break-all">
                  {activeCheckout.checkout.payment_content}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Trạng thái</div>
                <div className="font-medium">
                  {checkoutStatus?.paid
                    ? "Hệ thống đã ghi nhận thanh toán"
                    : "Chờ SePay webhook xác nhận"}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    activeCheckout.checkout.payment_content
                  );
                  toast.success("Đã sao chép nội dung chuyển khoản");
                }}
              >
                Sao chép nội dung
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8 xl:mx-16">
        {pricings.map((pricing) => (
          <Card
            key={pricing.title}
            className={
              pricing.popular
                ? "drop-shadow-xl shadow-black/10 dark:shadow-white/10"
                : "xl:my-8 "
            }
          >
            <CardHeader>
              <CardTitle className="flex item-center justify-between">
                {pricing.title}
                {pricing.popular ? (
                  <Badge variant="secondary" className="text-sm text-primary">
                    Đáng giá nhất
                  </Badge>
                ) : null}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">
                  {pricing.price.toLocaleString()}đ
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  {formatBillingPeriod(pricing.premium_duration_days)}
                </span>
              </div>

              <CardDescription>{pricing.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                className="w-full"
                disabled={
                  pricing.current || pricing.price === 0 || hasActivePlan
                }
                variant={pricing.popular ? "default" : "outline"}
                onClick={() =>
                  checkout(pricing.id, (data) => {
                    setActiveCheckout({ planId: pricing.id, checkout: data });
                  })
                }
              >
                {pricing.current
                  ? "Gói hiện tại"
                  : hasActivePlan
                  ? "Đang dùng gói khác"
                  : "Bắt đầu ngay"}
              </Button>
            </CardContent>

            <hr className="w-4/5 m-auto mb-4" />

            <CardFooter className="flex">
              <div className="space-y-4">
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">
                    {pricing.feature_max_collaborators} Cộng tác viên
                  </h3>
                </span>
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">
                    {formatNumber(pricing.feature_usage_credits_per_month)}{" "}
                    Credit thao tác / tháng
                  </h3>
                </span>
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">{pricing.feature_max_guilds} Server</h3>
                </span>
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">
                    {pricing.feature_max_commands} Lệnh & Biến
                  </h3>
                </span>
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">
                    {pricing.feature_max_event_listeners} Bộ lắng nghe sự kiện
                  </h3>
                </span>
                <span className="flex">
                  <CheckIcon className="text-green-500" />{" "}
                  <h3 className="ml-2">
                    {pricing.feature_priority_support
                      ? "Hỗ trợ ưu tiên"
                      : "Hỗ trợ cộng đồng"}
                  </h3>
                </span>
                {pricing.feature_custom_bot_status && (
                  <span className="flex">
                    <CheckIcon className="text-green-500" />{" "}
                    <h3 className="ml-2">Trạng thái bot tùy chỉnh</h3>
                  </span>
                )}
                {pricing.feature_ai_included && (
                  <span className="flex">
                    <CheckIcon className="text-green-500 shrink-0" />{" "}
                    <h3 className="ml-2">
                      Trợ lý AI ·{" "}
                      {formatNumber(pricing.feature_ai_credit_per_day)} credit /
                      ngày
                      <span className="block text-xs text-muted-foreground">
                        làm mới mỗi ngày, không cộng dồn
                      </span>
                    </h3>
                  </span>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
