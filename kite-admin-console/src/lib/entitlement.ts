const DAY = 24 * 60 * 60 * 1000

/**
 * How many days an entitlement was granted for, from its creation to its end.
 * null means it never expires.
 */
export function grantedDays(createdAt: string, endsAt: string | null): number | null {
  if (!endsAt) return null
  const days = (new Date(endsAt).getTime() - new Date(createdAt).getTime()) / DAY
  return Number.isFinite(days) ? Math.max(0, Math.round(days)) : null
}

/** The duration the plan itself defines: 0 days means permanent. */
export function planDurationDays(plan: { premium_duration_days: number }): number | null {
  return plan.premium_duration_days > 0 ? plan.premium_duration_days : null
}

export function formatDuration(days: number | null): string {
  return days === null ? "Vĩnh viễn" : `${days} ngày`
}

/**
 * A manual grant overrides the plan when its duration differs from what the
 * plan defines. Only manual grants are compared: a subscription entitlement
 * that was cancelled early is shorter than its plan for a different reason.
 */
export function isOverride(type: string, granted: number | null, planDays: number | null): boolean {
  return type === "manual" && granted !== planDays
}

/** What the admin typed for a grant, as days (null = permanent), or undefined if invalid. */
export function parseGrantDays(input: string): number | null | undefined {
  const text = input.trim()
  if (text === "" || text === "0") return null
  if (!/^\d+$/.test(text)) return undefined
  const days = Number(text)
  return days <= 36500 ? days : undefined
}
