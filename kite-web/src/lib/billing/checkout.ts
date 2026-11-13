/** Where a payment is, from what the user sees: waiting, done, or no longer usable. */
export type CheckoutPhase = "pending" | "paid" | "expired" | "failed";

export function remainingMs(expiresAt: string, now: number): number {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return Number.POSITIVE_INFINITY;
  return Math.max(0, end - now);
}

/**
 * The phase of a checkout. The server reports "pending" until the money arrives
 * and may never flip a lapsed session, so the end time counts as well: a QR code
 * past its time is shown as expired. A paid session is paid, whatever the clock
 * says.
 */
export function checkoutPhase({
  paid,
  status,
  expiresAt,
  now,
}: {
  paid: boolean;
  status: string | undefined;
  expiresAt: string;
  now: number;
}): CheckoutPhase {
  if (paid || status?.toLowerCase() === "paid") return "paid";

  const s = status?.toLowerCase();
  if (s === "failed") return "failed";
  if (s === "expired") return "expired";

  return remainingMs(expiresAt, now) <= 0 ? "expired" : "pending";
}

/** Where to open a support ticket when a payment goes wrong. */
export const SUPPORT_URL = "https://discord.gg/vibestore";
export const SUPPORT_LABEL = "discord.gg/vibestore";

/**
 * After this long, a transfer that is still not confirmed is no longer a wait but
 * a problem for support: the confirmation of a bank comes in a minute or two.
 */
export const SUPPORT_AFTER_MS = 5 * 60 * 1000;

export function isLongWait(waitedMs: number): boolean {
  return waitedMs >= SUPPORT_AFTER_MS;
}

/** 1500000 -> "25:00". Minutes are not wrapped into hours: a QR code lives for minutes. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms)) return "--:--";
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
