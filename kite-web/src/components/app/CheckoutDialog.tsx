import {
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  Loader2Icon,
  RefreshCwIcon,
  TimerIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCheckoutCancelMutation } from "@/lib/api/mutations";
import { useBillingCheckoutStatus } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import {
  checkoutPhase,
  CheckoutPhase,
  formatCountdown,
  isLongWait,
  remainingMs,
  SUPPORT_LABEL,
  SUPPORT_URL,
} from "@/lib/billing/checkout";
import { BillingCheckoutResponse } from "@/lib/types/wire.gen";
import { cn, formatNumber } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";

const PHASE_BADGE: Record<
  CheckoutPhase,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Đang chờ xác nhận", variant: "secondary" },
  paid: { label: "Đã thanh toán", variant: "default" },
  expired: { label: "Hết hạn", variant: "destructive" },
  failed: { label: "Không còn hiệu lực", variant: "destructive" },
};

/**
 * The payment of a plan: the QR code and the details to transfer, in a dialog on
 * a computer and a drawer on a phone, so it can not be missed on a long page.
 *
 * While the money is awaited the dialog does not close by a tap outside it or a
 * swipe down, so a stray touch does not lose the QR code; it closes by its own
 * buttons. The page behind it is locked by the dialog, and the plan buttons are
 * disabled by the page.
 */
export default function CheckoutDialog({
  checkout,
  planId,
  planTitle,
  retrying,
  onPaid,
  onRetry,
  onClose,
}: {
  checkout: BillingCheckoutResponse;
  planId: string;
  planTitle: string;
  /** A new code is being made. */
  retrying: boolean;
  /** Called once when the payment is confirmed. */
  onPaid: () => void;
  /** Makes a new code for the same plan. */
  onRetry: () => void;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const appId = useAppId();
  const [now, setNow] = useState(() => Date.now());

  // How long the money has been awaited, for the hint to support.
  const openedAt = useRef(Date.now());
  const waitedLong = isLongWait(now - openedAt.current);

  // Giving up on the order asks once more before it is done. Once it is done the
  // dialog stays, to say that the code must not be paid any more.
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const cancelMutation = useCheckoutCancelMutation(appId);

  // How the payment ended, once it did. It sticks: after it the status is no
  // longer asked for (an empty ID turns the query off) and what was learned
  // must not be undone by the answer that is no longer there.
  const [outcome, setOutcome] = useState<CheckoutPhase | null>(null);
  const settled = outcome !== null;

  const status = useBillingCheckoutStatus(
    settled ? "" : checkout.payment_id,
    settled ? "" : planId,
  );

  const live = checkoutPhase({
    paid: Boolean(status?.paid),
    status: status?.status,
    expiresAt: checkout.expires_at,
    now,
  });

  useEffect(() => {
    if (live !== "pending") setOutcome((previous) => previous ?? live);
  }, [live]);

  const phase = outcome ?? live;
  const waiting = phase === "pending";

  useEffect(() => {
    if (settled) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [settled]);

  const reported = useRef(false);
  useEffect(() => {
    if (phase === "paid" && !reported.current) {
      reported.current = true;
      onPaid();
    }
  }, [phase, onPaid]);

  const body = cancelled ? (
    <CancelledNotice paymentContent={checkout.payment_content} />
  ) : (
    <CheckoutBody
      checkout={checkout}
      phase={phase}
      remaining={remainingMs(checkout.expires_at, now)}
      waitedLong={waitedLong}
    />
  );

  const cancelOrder = () => {
    cancelMutation.mutate(checkout.payment_id, {
      onSuccess(res) {
        if (!res.success) {
          toast.error(`Không hủy được đơn: ${res.error.message}`);
          return;
        }

        // The money arrived before the cancel did: the order is paid, not cancelled.
        if (res.data.paid) {
          setConfirmingCancel(false);
          setOutcome("paid");
          return;
        }

        toast.success("Đã hủy đơn thanh toán");
        setConfirmingCancel(false);
        setCancelled(true);
        // Nothing is awaited any more: stop asking the server.
        setOutcome("failed");
      },
      onError() {
        toast.error("Không hủy được đơn, hãy thử lại");
      },
    });
  };

  const footer = (
    <CheckoutActions
      phase={cancelled ? "paid" : phase}
      retrying={retrying}
      cancelling={cancelMutation.isPending}
      confirmingCancel={confirmingCancel}
      onAskCancel={() => setConfirmingCancel(true)}
      onKeep={() => setConfirmingCancel(false)}
      onCancel={cancelOrder}
      onRetry={onRetry}
      onClose={onClose}
    />
  );

  const title = `Thanh toán gói ${planTitle}`;
  const description = cancelled
    ? "Đơn thanh toán này đã được hủy."
    : phase === "paid"
      ? "Gói đã được kích hoạt cho ứng dụng của bạn."
      : "Chuyển khoản đúng số tiền và nội dung để hệ thống tự xác nhận.";

  if (isMobile) {
    return (
      <Drawer
        open
        // A swipe down (or Escape) must not drop the QR code while the money is
        // awaited.
        dismissible={!waiting}
        onOpenChange={(open) => !open && onClose()}
      >
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{body}</div>
          <DrawerFooter className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(event) => {
          // A click beside the dialog must not drop the QR code while it is awaited.
          if (waiting) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          // Nor must the Escape key: it ends the order by the buttons only.
          if (waiting) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupportLink() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-2"
    >
      {SUPPORT_LABEL}
    </a>
  );
}

/** What the order is left as once it was cancelled. */
function CancelledNotice({ paymentContent }: { paymentContent: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center"
    >
      <BanIcon className="size-10 text-destructive" />
      <p className="text-lg font-semibold">Đã hủy đơn thanh toán</p>
      <p className="max-w-md text-sm">
        <strong className="text-destructive">
          TUYỆT ĐỐI không chuyển khoản vào mã này nữa.
        </strong>{" "}
        Nếu lỡ chuyển khoản, hãy tạo ticket hỗ trợ tại <SupportLink /> và gửi
        kèm nội dung chuyển khoản{" "}
        <span className="font-mono">{paymentContent}</span>.
      </p>
    </div>
  );
}

function CheckoutBody({
  checkout,
  phase,
  remaining,
  waitedLong,
}: {
  checkout: BillingCheckoutResponse;
  phase: CheckoutPhase;
  remaining: number;
  waitedLong: boolean;
}) {
  const badge = PHASE_BADGE[phase];
  const usable = phase === "pending";

  if (phase === "paid") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 px-4 py-10 text-center"
      >
        <CheckCircle2Icon className="size-12 text-primary" />
        <p className="text-lg font-semibold">Thanh toán thành công</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Hệ thống đã ghi nhận {formatNumber(checkout.amount)}đ. Gói mới được áp
          dụng ngay cho ứng dụng.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!usable ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            {phase === "expired"
              ? "Mã này đã quá thời gian thanh toán. Đừng chuyển khoản vào mã này, hãy tạo mã mới."
              : "Mã này không còn dùng được (có thể bạn đã tạo mã khác). Hãy tạo mã mới."}{" "}
            Nếu lỡ chuyển khoản vào mã này, hãy tạo ticket hỗ trợ tại{" "}
            <SupportLink /> kèm nội dung chuyển khoản.
          </span>
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
        <div className="mx-auto flex flex-col items-center gap-3 md:mx-0">
          <div className="relative rounded-2xl bg-white p-3 shadow-lg shadow-black/10 ring-1 ring-black/5">
            <img
              src={checkout.qr_code_url}
              alt="Mã QR thanh toán SePay"
              className={cn(
                "size-52 rounded-xl object-contain sm:size-56",
                !usable && "opacity-20 blur-[2px]",
              )}
            />
            {!usable ? (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <span className="rounded-md bg-background px-3 py-1.5 text-sm font-semibold shadow-md">
                  {phase === "expired"
                    ? "Mã QR đã hết hạn"
                    : "Mã đã bị thay thế"}
                </span>
              </div>
            ) : null}
          </div>

          <div
            className="flex items-center gap-2 text-sm"
            aria-live="polite"
            role="status"
          >
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {usable ? (
              <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                <TimerIcon className="size-3.5" />
                {formatCountdown(remaining)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 text-sm">
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
            disabled={!usable}
          />
          <CopyablePaymentDetail
            label="Nội dung chuyển khoản"
            value={checkout.payment_content}
            successMessage="Đã sao chép nội dung chuyển khoản"
            disabled={!usable}
          />

          {usable ? (
            <>
              <p className="text-xs text-muted-foreground">
                Nhập đúng nội dung chuyển khoản. Nếu bạn đã chuyển khoản, gói sẽ
                tự kích hoạt sau khi SePay báo về, kể cả khi bạn đóng cửa sổ
                này.
              </p>
              <p
                role={waitedLong ? "alert" : undefined}
                className={cn(
                  waitedLong
                    ? "rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground"
                    : "text-xs text-muted-foreground",
                )}
              >
                Đã chuyển khoản và đợi hơn 5 phút mà đơn chưa hoàn thành? Hãy
                tạo ticket hỗ trợ tại <SupportLink /> kèm nội dung chuyển khoản{" "}
                <span className="font-mono">{checkout.payment_content}</span>.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CheckoutActions({
  phase,
  retrying,
  cancelling,
  confirmingCancel,
  onAskCancel,
  onKeep,
  onCancel,
  onRetry,
  onClose,
}: {
  phase: CheckoutPhase;
  retrying: boolean;
  cancelling: boolean;
  confirmingCancel: boolean;
  onAskCancel: () => void;
  onKeep: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  if (phase === "paid") {
    return (
      <Button className="w-full sm:w-auto" onClick={onClose}>
        Xong
      </Button>
    );
  }

  if (phase === "pending" && confirmingCancel) {
    return (
      <div className="flex w-full flex-col gap-3">
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
        >
          <strong>Hủy đơn thanh toán này?</strong> Mã QR sẽ không dùng được nữa.
          Nếu bạn đã chuyển khoản, đừng hủy: hãy đợi hệ thống xác nhận.{" "}
          <strong className="text-destructive">
            Sau khi hủy, TUYỆT ĐỐI không chuyển khoản vào mã đó nữa.
          </strong>{" "}
          Nếu lỡ chuyển, hãy tạo ticket hỗ trợ tại <SupportLink />.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onKeep}
            disabled={cancelling}
          >
            Giữ đơn
          </Button>
          <Button
            variant="destructive"
            className="w-full gap-2 sm:w-auto"
            onClick={onCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            {cancelling ? "Đang hủy..." : "Hủy đơn"}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive sm:w-auto"
          onClick={onAskCancel}
          disabled={retrying}
        >
          Hủy đơn
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onClose}
          disabled={retrying}
        >
          Đóng
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
        Đóng
      </Button>
      <Button
        className="w-full gap-2 sm:w-auto"
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <RefreshCwIcon className="size-4" />
        )}
        {retrying ? "Đang tạo mã..." : "Tạo mã mới"}
      </Button>
    </>
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
  disabled,
}: {
  label: string;
  value: string;
  successMessage: string;
  disabled: boolean;
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
        disabled={disabled}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success(successMessage);
          } catch {
            toast.error("Không sao chép được, hãy chọn và sao chép thủ công");
          }
        }}
      >
        <CopyIcon data-icon="inline-start" className="size-3.5" />
        Sao chép
      </Button>
    </div>
  );
}
