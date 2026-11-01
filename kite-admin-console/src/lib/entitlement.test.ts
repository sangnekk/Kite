import { describe, expect, it } from "vitest"
import { formatDuration, grantedDays, isOverride, parseGrantDays, planDurationDays } from "./entitlement"

const created = "2026-11-01T10:00:00Z"

describe("grantedDays", () => {
  it("counts the days between grant and end", () => {
    expect(grantedDays(created, "2026-12-01T10:00:00Z")).toBe(30)
    expect(grantedDays(created, "2027-11-02T10:00:00Z")).toBe(366)
  })

  it("is null for a permanent grant", () => {
    expect(grantedDays(created, null)).toBeNull()
  })

  it("rounds away small clock differences and never goes negative", () => {
    expect(grantedDays(created, "2026-12-01T10:00:30Z")).toBe(30)
    expect(grantedDays(created, "2026-10-01T10:00:00Z")).toBe(0)
  })

  it("survives garbage dates", () => {
    expect(grantedDays("nope", "also nope")).toBeNull()
  })
})

describe("planDurationDays", () => {
  it("maps 0 to permanent", () => {
    expect(planDurationDays({ premium_duration_days: 0 })).toBeNull()
    expect(planDurationDays({ premium_duration_days: 366 })).toBe(366)
  })
})

describe("isOverride", () => {
  it("flags a manual grant that differs from the plan", () => {
    expect(isOverride("manual", 30, 366)).toBe(true)
    expect(isOverride("manual", null, 30)).toBe(true)
    expect(isOverride("manual", 30, null)).toBe(true)
  })

  it("does not flag a grant that matches the plan", () => {
    expect(isOverride("manual", 366, 366)).toBe(false)
    expect(isOverride("manual", null, null)).toBe(false)
  })

  it("never flags subscription entitlements, even when cut short", () => {
    expect(isOverride("subscription", 3, 30)).toBe(false)
  })
})

describe("parseGrantDays", () => {
  it("treats empty and 0 as permanent", () => {
    expect(parseGrantDays("")).toBeNull()
    expect(parseGrantDays("  ")).toBeNull()
    expect(parseGrantDays("0")).toBeNull()
  })

  it("parses whole days and rejects the rest", () => {
    expect(parseGrantDays("30")).toBe(30)
    for (const bad of ["-1", "1.5", "abc", "36501", "1e3"]) expect(parseGrantDays(bad), bad).toBeUndefined()
  })
})

describe("formatDuration", () => {
  it("writes days or permanent", () => {
    expect(formatDuration(366)).toBe("366 ngày")
    expect(formatDuration(null)).toBe("Vĩnh viễn")
  })
})
