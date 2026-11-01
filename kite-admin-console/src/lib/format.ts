const locale = "vi-VN"

/** 39000 -> "39.000 ₫" */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(locale).format(n)
}

/** Compact form for cards and charts: 1.250.000 -> "1,3 Tr". */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  // The year in full: with two digits "2076" reads as "76", which looks like 1976.
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/**
 * A plan with no expiry is stored as a renewal 50 years away (see the
 * fulfillment of a payment), which is not a date anyone means. Anything this far
 * out is shown as lifetime.
 */
export function isLifetime(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() - now.getTime() > 30 * 365 * 24 * 3600 * 1000
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d)
}

/** "2026-11-04" -> "04/11" without going through a timezone. */
export function formatDayMonth(day: string): string {
  const [, month, date] = day.split("-")
  return month && date ? `${date}/${month}` : day
}

/** Percentage change between two values, null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

/** -1 is the plans' way of saying unlimited. */
export function formatLimit(n: number): string {
  return n < 0 ? "Không giới hạn" : formatNumber(n)
}

export function discordAvatarUrl(discordId: string, avatar: string | null, size = 64): string | null {
  if (!avatar) return null
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=${size}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}
