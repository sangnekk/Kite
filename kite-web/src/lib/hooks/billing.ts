import { useCallback } from "react";
import { useCheckoutCreateMutation } from "../api/mutations";
import { useAppId } from "./params";
import { toast } from "sonner";
import { BillingCheckoutResponse } from "../types/wire.gen";

type CheckoutSuccessHandler = (checkout: BillingCheckoutResponse) => void;

export function useBillingCheckout() {
  const appId = useAppId();
  const checkoutMutation = useCheckoutCreateMutation(appId);

  return useCallback(
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
        }
      );
    },
    [checkoutMutation]
  );
}
