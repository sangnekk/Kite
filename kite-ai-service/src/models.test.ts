import { describe, expect, test } from "bun:test"
import { parseKiteModels } from "./models"

// The exact shape kite-service answers with.
const real = {
  success: true,
  data: {
    default_model: "fast",
    models: [
      { key: "fast", model: "vendor/fast" },
      { key: "pro", model: "vendor/pro" },
    ],
  },
}

describe("parseKiteModels", () => {
  test("reads the enveloped answer of kite-service", () => {
    expect(parseKiteModels(real)).toEqual({
      map: { fast: "vendor/fast", pro: "vendor/pro" },
      defaultKey: "fast",
    })
  })

  test("a bare, unwrapped body is NOT accepted (this was the bug)", () => {
    expect(parseKiteModels(real.data)).toBeNull()
  })

  test("a failed answer is a failure, not an empty list", () => {
    expect(parseKiteModels({ success: false, data: {}, error: { code: "unauthorized" } })).toBeNull()
    expect(parseKiteModels({ success: true, data: {} })).toBeNull()
    expect(parseKiteModels({ success: true, data: null })).toBeNull()
  })

  test("garbage never throws", () => {
    for (const body of [null, undefined, "x", 3, [], { success: true }]) {
      expect(parseKiteModels(body)).toBeNull()
    }
  })

  test("an explicitly empty list is a valid answer", () => {
    expect(parseKiteModels({ success: true, data: { default_model: "", models: [] } })).toEqual({
      map: {},
      defaultKey: "",
    })
  })

  test("skips incomplete entries", () => {
    const parsed = parseKiteModels({
      success: true,
      data: { models: [{ key: "ok", model: "m" }, { key: "no-model" }, { model: "no-key" }, null, { key: "", model: "x" }] },
    })
    expect(parsed?.map).toEqual({ ok: "m" })
  })
})
