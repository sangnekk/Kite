import { describe, expect, it } from "vitest"
import type { SettingsGroup } from "@/lib/types"
import { GROUP_BY_ID, type GroupSpec } from "./groups"
import { buildPatch, initialState, toApiValue, validate } from "./payload"

const billing = GROUP_BY_ID.billing
const limits = GROUP_BY_ID.limits

const billingData: SettingsGroup = {
  values: {
    merchant_bank_name: "MBBank",
    merchant_account_no: "123",
    checkout_ttl_minutes: 30,
    sepay_secret_key: "",
  },
  secrets_set: { sepay_secret_key: true },
  restart_required: false,
}

// No group has a switch right now, but the form supports them.
const flags: GroupSpec = {
  id: "flags",
  label: "Flags",
  description: "",
  fields: [
    { key: "flag", label: "Flag", kind: "bool" },
    { key: "missing", label: "Missing", kind: "bool" },
  ],
}
const flagData: SettingsGroup = { values: { flag: true }, secrets_set: {}, restart_required: false }

const limitsData: SettingsGroup = {
  values: { max_apps_per_user: 10, max_asset_size: 8_000_000 },
  secrets_set: {},
  restart_required: false,
}

describe("initialState", () => {
  it("shows numbers as text and bytes as megabytes", () => {
    const s = initialState(limits, limitsData)
    expect(s.values).toEqual({ max_apps_per_user: "10", max_asset_size: "8" })
  })

  it("never puts a secret into the form", () => {
    const s = initialState(billing, billingData)
    expect(s.values).not.toHaveProperty("sepay_secret_key")
    expect(s.secrets).toEqual({})
  })

  it("copes with settings the server does not know yet", () => {
    const s = initialState(billing, { values: {}, secrets_set: {}, restart_required: false })
    expect(s.values.merchant_account_no).toBe("")
  })
})

describe("buildPatch", () => {
  it("is null when nothing changed", () => {
    expect(buildPatch(billing, billingData, initialState(billing, billingData))).toBeNull()
    expect(buildPatch(limits, limitsData, initialState(limits, limitsData))).toBeNull()
  })

  it("sends only the fields that changed", () => {
    const state = initialState(billing, billingData)
    state.values.merchant_account_no = "999"
    state.values.checkout_ttl_minutes = "45"
    expect(buildPatch(billing, billingData, state)).toEqual({
      values: { merchant_account_no: "999", checkout_ttl_minutes: 45 },
      clear_secrets: [],
    })
  })

  it("converts megabytes back to bytes", () => {
    const state = initialState(limits, limitsData)
    state.values.max_asset_size = "2,5"
    expect(buildPatch(limits, limitsData, state)?.values).toEqual({ max_asset_size: 2_500_000 })
  })

  it("sends a secret only when a new one was typed", () => {
    const state = initialState(billing, billingData)
    state.secrets.sepay_secret_key = "  new-secret  "
    expect(buildPatch(billing, billingData, state)).toEqual({
      values: { sepay_secret_key: "new-secret" },
      clear_secrets: [],
    })

    const blank = initialState(billing, billingData)
    blank.secrets.sepay_secret_key = "   "
    expect(buildPatch(billing, billingData, blank)).toBeNull()
  })

  it("erases a secret only when asked to", () => {
    const state = initialState(billing, billingData)
    state.cleared = ["sepay_secret_key"]
    expect(buildPatch(billing, billingData, state)).toEqual({ values: {}, clear_secrets: ["sepay_secret_key"] })
  })

  it("typing a new secret wins over a clear request", () => {
    const state = initialState(billing, billingData)
    state.cleared = ["sepay_secret_key"]
    state.secrets.sepay_secret_key = "fresh"
    expect(buildPatch(billing, billingData, state)).toEqual({ values: { sepay_secret_key: "fresh" }, clear_secrets: [] })
  })

  it("can switch a boolean off and ignores one the server does not know yet", () => {
    const state = initialState(flags, flagData)
    expect(state.values.flag).toBe(true)
    expect(state.values.missing).toBe(false)

    state.values.flag = false
    expect(buildPatch(flags, flagData, state)?.values).toEqual({ flag: false })
  })

  it("skips invalid numbers instead of sending garbage", () => {
    const state = initialState(billing, billingData)
    state.values.checkout_ttl_minutes = "abc"
    expect(buildPatch(billing, billingData, state)).toBeNull()
  })
})

describe("validate", () => {
  it("accepts the stored values", () => {
    expect(validate(limits, initialState(limits, limitsData))).toEqual({})
  })

  it("rejects negative, fractional and non numeric counts", () => {
    for (const bad of ["-1", "1.5", "abc", "", "1e3"]) {
      const state = initialState(limits, limitsData)
      state.values.max_apps_per_user = bad
      expect(validate(limits, state), bad).toHaveProperty("max_apps_per_user")
    }
  })

  it("accepts decimal megabytes with a comma or a dot", () => {
    for (const ok of ["0", "8", "2.5", "2,5"]) {
      const state = initialState(limits, limitsData)
      state.values.max_asset_size = ok
      expect(validate(limits, state), ok).toEqual({})
    }
    const state = initialState(limits, limitsData)
    state.values.max_asset_size = "-3"
    expect(validate(limits, state)).toHaveProperty("max_asset_size")
  })
})

describe("toApiValue", () => {
  it("trims text", () => {
    expect(toApiValue({ key: "k", label: "k", kind: "text" }, "  hi ")).toBe("hi")
  })
})
