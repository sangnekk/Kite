import { useCallback } from "react";
import { useCheckoutCreateMutation } from "../api/mutations";
import { useAppId } from "./params";
import { toast } from "sonner";
import { BillingCheckoutResponse } from "../types/wire.gen";

type CheckoutSuccessHandler = (checkout: BillingCheckoutResponse) => void;

/**
 * Starts the payment of a plan. `isPending` is true while the code is being
 * made, so the buttons can be locked: a second tap would make a second payment
 * that replaces the first.
 */
export function useBillingCheckout() {
  const appId = useAppId();
  const checkoutMutation = useCheckoutCreateMutation(appId);

  const checkout = useCallback(
    (planId: string, onSuccess?: CheckoutSuccessHandler) => {
      checkoutMutation.mutate(
        {
          plan_id: planId,
        },
        {
          onSuccess(res) {
            if (res.success) {
              onSuccess?.(res.data);
            } else {
              toast.error(
                `Tạo thanh toán thất bại: ${res.error.message} ${res.error.code}`
              );
            }
          },
          onError() {
            toast.error("Tạo thanh toán thất bại, hãy thử lại");
          },
        }
      );
    },
    [checkoutMutation]
  );

  return { checkout, isPending: checkoutMutation.isPending };
}
