import type { AIProviderView, SettingsGroup } from "@/lib/types"

export interface ModelDraft {
  key: string
  name: string
  model: string
  credits: string
}

export interface ProviderDraft {
  /** Stable identity for React lists while the admin edits ids. */
  uid: string
  id: string
  api: "openai" | "anthropic"
  base_url: string
  /** A key typed by the admin; empty keeps the stored one. */
  api_key: string
  api_key_set: boolean
  models: ModelDraft[]
}

export interface AIDraft {
  default_model: string
  providers: ProviderDraft[]
}

let counter = 0
export const newUid = () => `p${++counter}`

export function emptyModel(): ModelDraft {
  return { key: "", name: "", model: "", credits: "10" }
}

export function emptyProvider(): ProviderDraft {
  return { uid: newUid(), id: "", api: "openai", base_url: "", api_key: "", api_key_set: false, models: [emptyModel()] }
}

export function toDraft(data: SettingsGroup): AIDraft {
  const providers = (data.values.providers as AIProviderView[] | null) ?? []
  return {
    default_model: String(data.values.default_model ?? ""),
    providers: providers.map((p) => ({
      uid: newUid(),
      id: p.id,
      api: p.api,
      base_url: p.base_url ?? "",
      api_key: "",
      api_key_set: p.api_key_set === true,
      models: (p.models ?? []).map((m) => ({ key: m.key, name: m.name, model: m.model, credits: String(m.credits) })),
    })),
  }
}

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/

/** Human readable problems, empty when the draft can be saved. */
export function validateDraft(draft: AIDraft): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const keys = new Set<string>()

  draft.providers.forEach((p, i) => {
    const label = p.id || `Nhà cung cấp #${i + 1}`
    if (!ID_PATTERN.test(p.id)) problems.push(`${label}: mã chỉ gồm chữ thường, số, - hoặc _ (tối đa 40 ký tự)`)
    else if (ids.has(p.id)) problems.push(`${label}: mã bị trùng`)
    ids.add(p.id)

    if (p.base_url.trim() !== "" && !/^https?:\/\/[^\s/]+/.test(p.base_url.trim())) {
      problems.push(`${label}: base URL phải bắt đầu bằng http:// hoặc https://`)
    }

    p.models.forEach((m, j) => {
      const mlabel = `${label} › mô hình #${j + 1}`
      if (!m.key.trim() || !m.name.trim() || !m.model.trim()) problems.push(`${mlabel}: cần khóa, tên và mã mô hình`)
      if (!/^\d+$/.test(m.credits.trim())) problems.push(`${mlabel}: credits phải là số nguyên không âm`)
      if (m.key.trim()) {
        if (keys.has(m.key.trim())) problems.push(`${mlabel}: khóa “${m.key.trim()}” bị trùng`)
        keys.add(m.key.trim())
      }
    })
  })

  if (draft.default_model && !keys.has(draft.default_model)) {
    problems.push("Mô hình mặc định không nằm trong danh sách mô hình")
  }
  return problems
}

export interface AIPatch {
  default_model: string
  providers: {
    id: string
    api: string
    base_url: string
    api_key?: string
    models: { key: string; name: string; model: string; credits: number }[]
  }[]
}

/** The body for PUT /settings/ai. A provider without a typed key keeps its stored key. */
export function buildAIPatch(draft: AIDraft): AIPatch {
  return {
    default_model: draft.default_model,
    providers: draft.providers.map((p) => ({
      id: p.id.trim(),
      api: p.api,
      base_url: p.base_url.trim(),
      ...(p.api_key.trim() ? { api_key: p.api_key.trim() } : {}),
      models: p.models.map((m) => ({
        key: m.key.trim(),
        name: m.name.trim(),
        model: m.model.trim(),
        credits: Number(m.credits.trim()),
      })),
    })),
  }
}

/** Whether saving would change anything compared to what the server has. */
export function isDirty(draft: AIDraft, original: AIDraft): boolean {
  const normalize = (d: AIDraft) =>
    JSON.stringify({
      default_model: d.default_model,
      providers: d.providers.map((p) => ({
        id: p.id.trim(),
        api: p.api,
        base_url: p.base_url.trim(),
        typed: p.api_key.trim() !== "",
        models: p.models.map((m) => [m.key.trim(), m.name.trim(), m.model.trim(), m.credits.trim()]),
      })),
    })
  return normalize(draft) !== normalize(original)
}
