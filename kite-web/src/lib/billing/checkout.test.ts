import { describe, expect, test } from "bun:test";
import {
  checkoutPhase,
  formatCountdown,
  isLongWait,
  remainingMs,
  SUPPORT_AFTER_MS,
  SUPPORT_URL,
} from "./checkout";

const now = new Date("2026-11-13T10:00:00Z").getTime();
const later = "2026-11-13T10:30:00Z";
const earlier = "2026-11-13T09:30:00Z";

describe("checkoutPhase", () => {
  test("waiting for the money while the time has not run out", () => {
    expect(checkoutPhase({ paid: false, status: "pending", expiresAt: later, now })).toBe("pending");
    expect(checkoutPhase({ paid: false, status: undefined, expiresAt: later, now })).toBe("pending");
  });

  test("paid, whatever the clock says", () => {
    expect(checkoutPhase({ paid: true, status: "paid", expiresAt: earlier, now })).toBe("paid");
    expect(checkoutPhase({ paid: false, status: "PAID", expiresAt: earlier, now })).toBe("paid");
  });

  test("a pending session past its time is shown as expired", () => {
    expect(checkoutPhase({ paid: false, status: "pending", expiresAt: earlier, now })).toBe("expired");
    expect(checkoutPhase({ paid: false, status: "pending", expiresAt: "2026-11-13T10:00:00Z", now })).toBe("expired");
  });

  test("the status of the server wins for the end states", () => {
    expect(checkoutPhase({ paid: false, status: "failed", expiresAt: later, now })).toBe("failed");
    expect(checkoutPhase({ paid: false, status: "expired", expiresAt: later, now })).toBe("expired");
  });

  test("a time that can not be read never expires the payment by itself", () => {
    expect(checkoutPhase({ paid: false, status: "pending", expiresAt: "nonsense", now })).toBe("pending");
  });
});

describe("support", () => {
  test("a transfer not confirmed after five minutes is for support", () => {
    expect(SUPPORT_AFTER_MS).toBe(5 * 60 * 1000);
    expect(isLongWait(0)).toBe(false);
    expect(isLongWait(5 * 60 * 1000 - 1)).toBe(false);
    expect(isLongWait(5 * 60 * 1000)).toBe(true);
    expect(isLongWait(20 * 60 * 1000)).toBe(true);
  });

  test("the ticket goes to the Discord server of Vibe Bot", () => {
    expect(SUPPORT_URL).toBe("https://discord.gg/vibestore");
  });
});

describe("remainingMs and formatCountdown", () => {
  test("counts down and stops at zero", () => {
    expect(remainingMs(later, now)).toBe(30 * 60 * 1000);
    expect(remainingMs(earlier, now)).toBe(0);
  });

  test("minutes and seconds", () => {
    expect(formatCountdown(30 * 60 * 1000)).toBe("30:00");
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(999)).toBe("00:01");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe("--:--");
  });
});
