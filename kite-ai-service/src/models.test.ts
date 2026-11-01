import { describe, expect, test } from "bun:test"
import { isServable, parseKiteModels, servableModels } from "./models"

// The exact shape kite-service answers with.
const real = {
  success: true,
  data: {
    default_model: "fast",
    models: [
      { key: "fast", model: "deepseek-v4-flash", name: "Fast", credits: 7 },
      { key: "pro", model: "deepseek-v4-pro", name: "Pro", credits: 13 },
    ],
  },
}

describe("parseKiteModels", () => {
  test("reads the enveloped answer of kite-service", () => {
    expect(parseKiteModels(real)).toEqual({
      models: [
        { key: "fast", model: "deepseek-v4-flash", name: "Fast", credits: 7 },
        { key: "pro", model: "deepseek-v4-pro", name: "Pro", credits: 13 },
      ],
      defaultKey: "fast",
    })
  })

  test("a bare, unwrapped body is NOT accepted", () => {
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
      models: [],
      defaultKey: "",
    })
  })

  test("skips incomplete entries and fills in a missing name or credits", () => {
    const parsed = parseKiteModels({
      success: true,
      data: {
        models: [
          { key: "ok", model: "deepseek-x" },
          { key: "no-model" },
          { model: "no-key" },
          null,
          { key: "", model: "deepseek-y" },
          { key: "odd", model: "deepseek-z", name: "", credits: "7" },
        ],
      },
    })
    expect(parsed?.models).toEqual([
      { key: "ok", model: "deepseek-x", name: "ok", credits: 0 },
      { key: "odd", model: "deepseek-z", name: "odd", credits: 0 },
    ])
  })
})

describe("what the copilot can serve", () => {
  test("only DeepSeek model ids", () => {
    for (const ok of ["deepseek-v4-flash", "deepseek-chat", "DeepSeek-Reasoner"]) expect(isServable(ok)).toBe(true)
    for (const no of ["gpt-4.1", "claude-sonnet-4-6", "meta-llama/llama-3.3-70b", "deepseek/deepseek-r1", "", "my-deepseek-clone"]) {
      expect(isServable(no), no).toBe(false)
    }
  })

  test("models of other providers are left out of the list", () => {
    const all = [
      { key: "fast", model: "deepseek-v4-flash", name: "Fast", credits: 7 },
      { key: "gpt", model: "gpt-4.1", name: "GPT", credits: 100 },
      { key: "claude", model: "claude-sonnet-4-6", name: "Claude", credits: 30 },
    ]
    expect(servableModels(all).map((m) => m.key)).toEqual(["fast"])
  })

  test("no DeepSeek model at all gives an empty list", () => {
    expect(servableModels([{ key: "gpt", model: "gpt-4.1", name: "GPT", credits: 1 }])).toEqual([])
  })
})
