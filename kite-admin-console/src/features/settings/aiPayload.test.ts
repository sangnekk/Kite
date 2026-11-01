import { describe, expect, it } from "vitest"
import type { SettingsGroup } from "@/lib/types"
import { buildAIPatch, emptyProvider, isDirty, toDraft, validateDraft } from "./aiPayload"

const data: SettingsGroup = {
  values: {
    default_model: "fast",
    providers: [
      {
        id: "vercel",
        api: "anthropic",
        base_url: "https://gateway.example.com",
        api_key_set: true,
        models: [
          { key: "fast", name: "Fast", model: "vendor/fast", credits: 7 },
          { key: "pro", name: "Pro", model: "vendor/pro", credits: 13 },
        ],
      },
    ],
  },
  secrets_set: {},
  restart_required: true,
}

describe("toDraft", () => {
  it("never carries a key into the form, only whether one is stored", () => {
    const draft = toDraft(data)
    expect(draft.providers[0].api_key).toBe("")
    expect(draft.providers[0].api_key_set).toBe(true)
    expect(draft.providers[0].models[1].credits).toBe("13")
  })

  it("handles an empty configuration", () => {
    expect(toDraft({ values: {}, secrets_set: {}, restart_required: true })).toEqual({ default_model: "", providers: [] })
  })
})

describe("validateDraft", () => {
  it("accepts what the server returned", () => {
    expect(validateDraft(toDraft(data))).toEqual([])
  })

  it("flags bad and duplicate provider ids", () => {
    const draft = toDraft(data)
    draft.providers.push({ ...emptyProvider(), id: "vercel", models: [] })
    draft.providers.push({ ...emptyProvider(), id: "Bad ID", models: [] })
    const problems = validateDraft(draft)
    expect(problems.some((p) => p.includes("trùng"))).toBe(true)
    expect(problems.some((p) => p.includes("Bad ID"))).toBe(true)
  })

  it("flags incomplete models, bad credits and duplicate keys across providers", () => {
    const draft = toDraft(data)
    draft.providers[0].models[0].name = ""
    draft.providers[0].models[1].credits = "-3"
    draft.providers.push({
      ...emptyProvider(),
      id: "other",
      models: [{ key: "fast", name: "Dup", model: "x", credits: "1" }],
    })
    const problems = validateDraft(draft)
    expect(problems.some((p) => p.includes("khóa, tên và mã"))).toBe(true)
    expect(problems.some((p) => p.includes("credits"))).toBe(true)
    expect(problems.some((p) => p.includes("“fast” bị trùng"))).toBe(true)
  })

  it("requires the default model to exist", () => {
    const draft = toDraft(data)
    draft.default_model = "ghost"
    expect(validateDraft(draft).join()).toContain("Mô hình mặc định")
    draft.default_model = ""
    expect(validateDraft(draft)).toEqual([])
  })

  it("rejects a base URL that is not http(s)", () => {
    const draft = toDraft(data)
    draft.providers[0].base_url = "ftp://x"
    expect(validateDraft(draft).join()).toContain("base URL")
  })
})

describe("buildAIPatch", () => {
  it("omits api_key unless a new one was typed", () => {
    const draft = toDraft(data)
    expect(buildAIPatch(draft).providers[0]).not.toHaveProperty("api_key")

    draft.providers[0].api_key = "  sk-new "
    expect(buildAIPatch(draft).providers[0].api_key).toBe("sk-new")
  })

  it("sends credits as numbers and trims text", () => {
    const draft = toDraft(data)
    draft.providers[0].id = " vercel "
    const patch = buildAIPatch(draft)
    expect(patch.providers[0].id).toBe("vercel")
    expect(patch.providers[0].models[0].credits).toBe(7)
  })

  it("never sends the display only api_key_set flag", () => {
    expect(JSON.stringify(buildAIPatch(toDraft(data)))).not.toContain("api_key_set")
    expect(JSON.stringify(buildAIPatch(toDraft(data)))).not.toContain("uid")
  })
})

describe("isDirty", () => {
  it("is false for an untouched draft and true after any edit", () => {
    const original = toDraft(data)
    expect(isDirty(toDraft(data), original)).toBe(false)

    const edited = toDraft(data)
    edited.providers[0].models[0].credits = "8"
    expect(isDirty(edited, original)).toBe(true)

    const typedKey = toDraft(data)
    typedKey.providers[0].api_key = "k"
    expect(isDirty(typedKey, original)).toBe(true)

    const removed = toDraft(data)
    removed.providers = []
    expect(isDirty(removed, original)).toBe(true)
  })

  it("ignores whitespace only changes", () => {
    const edited = toDraft(data)
    edited.providers[0].models[0].name = " Fast "
    expect(isDirty(edited, toDraft(data))).toBe(false)
  })
})
