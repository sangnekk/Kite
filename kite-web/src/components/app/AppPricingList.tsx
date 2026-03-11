import { CheckIcon, InfinityIcon } from "lucide-react";
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
import { useAppSubscriptions, useBillingPlans } from "@/lib/hooks/api";
import { ReactNode, useMemo } from "react";
import { useLemonSqueezyCheckout } from "@/lib/hooks/lemonsqueezy";
import { formatNumber } from "@/lib/utils";

export default function AppPricingList() {
  const subscriptions = useAppSubscriptions();

  const activeSubscriptions = subscriptions?.filter(
    (subscription) => subscription!.status !== "expired"
  );

  const plans = useBillingPlans();

  const pricings = useMemo(() => {
    return (
      plans
        ?.filter((plan) => !plan!.hidden)
        .map((plan) => {
          return {
            ...plan!,
            current: activeSubscriptions?.some(
              (subscription) =>
                subscription!.lemonsqueezy_product_id ===
                plan!.lemonsqueezy_product_id
            ),
          };
        }) ?? []
    );
  }, [activeSubscriptions, plans]);

  const checkout = useLemonSqueezyCheckout();

  return (
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
              <span className="text-3xl font-bold">${pricing.price}</span>
              <span className="text-muted-foreground"> /month</span>
            </div>

            <CardDescription>{pricing.description}</CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              className="w-full"
              disabled={pricing.current || pricing.price === 0}
              variant={pricing.popular ? "default" : "outline"}
              onClick={() => checkout(pricing.lemonsqueezy_variant_id)}
            >
              {pricing.current ? "Gói hiện tại" : "Bắt đầu ngay"}
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
                  Credits / tháng
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
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
