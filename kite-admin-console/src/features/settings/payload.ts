import type { SettingsGroup } from "@/lib/types"
import type { FieldSpec, GroupSpec } from "./groups"

const MB = 1_000_000

/** What the form holds while the admin edits: everything as the user typed it. */
export interface FormState {
  values: Record<string, string | boolean>
  /** New secret values typed by the admin; empty means "leave as stored". */
  secrets: Record<string, string>
  /** Secrets the admin asked to erase. */
  cleared: string[]
}

export function initialState(spec: GroupSpec, data: SettingsGroup): FormState {
  const values: FormState["values"] = {}
  for (const field of spec.fields) {
    if (field.kind === "secret") continue
    const raw = data.values[field.key]
    if (field.kind === "bool") values[field.key] = raw === true
    else if (field.kind === "megabytes") values[field.key] = String(Number(raw ?? 0) / MB)
    else values[field.key] = raw === undefined || raw === null ? "" : String(raw)
  }
  return { values, secrets: {}, cleared: [] }
}

function parseCount(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  return Number(text.trim())
}

function parseMegabytes(text: string): number | null {
  const t = text.trim().replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t) * MB)
}

/** The value of a field as the API expects it, or null when the text is invalid. */
export function toApiValue(field: FieldSpec, raw: string | boolean): string | number | boolean | null {
  switch (field.kind) {
    case "bool":
      return raw === true
    case "number":
      return parseCount(String(raw))
    case "megabytes":
      return parseMegabytes(String(raw))
    default:
      return String(raw).trim()
  }
}

export function validate(spec: GroupSpec, state: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of spec.fields) {
    if (field.kind === "number" && toApiValue(field, state.values[field.key]) === null) {
      errors[field.key] = "Nhập một số nguyên không âm"
    }
    if (field.kind === "megabytes" && toApiValue(field, state.values[field.key]) === null) {
      errors[field.key] = "Nhập một số không âm, ví dụ 8 hoặc 2,5"
    }
  }
  return errors
}

export interface SettingsPatch {
  values: Record<string, string | number | boolean>
  clear_secrets: string[]
}

/**
 * Only what changed is sent: a setting that was not touched keeps whatever is
 * stored (including a value another admin saved meanwhile). A secret is sent
 * only when a new one was typed, and erased only when explicitly cleared.
 * Returns null when there is nothing to save.
 */
export function buildPatch(spec: GroupSpec, data: SettingsGroup, state: FormState): SettingsPatch | null {
  const values: SettingsPatch["values"] = {}

  for (const field of spec.fields) {
    if (field.kind === "secret") {
      const typed = state.secrets[field.key]?.trim()
      if (typed) values[field.key] = typed
      continue
    }

    const next = toApiValue(field, state.values[field.key])
    if (next === null) continue
    const stored = data.values[field.key]
    if (next !== (stored ?? (field.kind === "bool" ? false : ""))) {
      values[field.key] = next
    }
  }

  const clear_secrets = state.cleared.filter((key) => !state.secrets[key]?.trim())

  if (Object.keys(values).length === 0 && clear_secrets.length === 0) return null
  return { values, clear_secrets }
}
