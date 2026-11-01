export type LoadedModels = { map: Record<string, string>; defaultKey?: string }

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

  const data = envelope.data as {
    default_model?: unknown
    models?: unknown
  }
  if (!Array.isArray(data.models)) return null

  const map: Record<string, string> = {}
  for (const m of data.models as { key?: unknown; model?: unknown }[]) {
    if (typeof m?.key === "string" && typeof m?.model === "string" && m.key && m.model) {
      map[m.key] = m.model
    }
  }
  return {
    map,
    defaultKey: typeof data.default_model === "string" ? data.default_model : undefined,
  }
}
