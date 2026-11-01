export type KiteModel = { key: string; name: string; model: string; credits: number }

export type LoadedModels = { models: KiteModel[]; defaultKey?: string }

/**
 * The copilot talks to DeepSeek with a single API key (see agent.ts), so it can
 * only run DeepSeek models. Models of other providers configured in kite-service
 * (OpenAI, Anthropic...) are meant for the AI nodes of bot flows and would fail
 * here, so they are left out instead of being offered and then breaking.
 */
export function isServable(model: string): boolean {
  return /^deepseek-/i.test(model)
}

export function servableModels(models: KiteModel[]): KiteModel[] {
  return models.filter((m) => isServable(m.model))
}

/**
 * Reads the answer of GET /v1/internal/ai/models. The API wraps every answer in
 * `{ success, data }`. Returns null when the answer is not in that shape, so a
 * malformed response is treated as a failure (and the caller keeps what it has)
 * instead of silently turning into "no models".
 */
export function parseKiteModels(body: unknown): LoadedModels | null {
  if (typeof body !== "object" || body === null) return null
  const envelope = body as { success?: unknown; data?: unknown }
  if (envelope.success !== true || typeof envelope.data !== "object" || envelope.data === null) return null

  const data = envelope.data as { default_model?: unknown; models?: unknown }
  if (!Array.isArray(data.models)) return null

  const models: KiteModel[] = []
  for (const m of data.models as { key?: unknown; model?: unknown; name?: unknown; credits?: unknown }[]) {
    if (typeof m?.key !== "string" || typeof m?.model !== "string" || !m.key || !m.model) continue
    models.push({
      key: m.key,
      model: m.model,
      name: typeof m.name === "string" && m.name ? m.name : m.key,
      credits: typeof m.credits === "number" && Number.isFinite(m.credits) ? m.credits : 0,
    })
  }

  return {
    models,
    defaultKey: typeof data.default_model === "string" ? data.default_model : undefined,
  }
}
