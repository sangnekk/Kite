import { readFileSync } from "node:fs";
import { parse as parseToml } from "smol-toml";
import { parseKiteModels, servableModels, type KiteModel, type LoadedModels } from "./models";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  // Base URL of the Go kite-service API.
  kiteApiBaseUrl: process.env.KITE_API_BASE_URL ?? "http://localhost:8080",
  // Allowed browser origins (comma-separated) for CORS with credentials.
  webOrigin: (process.env.WEB_ORIGIN ?? "http://localhost:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  maxSteps: Number(process.env.MAX_STEPS ?? 8),
  // Path to the mounted kite.toml (single source of AI model config).
  kiteConfigPath: process.env.KITE_CONFIG_PATH ?? "/app/kite.toml",
  // Max number of /chat turns allowed to run concurrently per app. The pre-stream
  // credit check is read-only (it doesn't reserve budget), so without this a burst
  // of concurrent requests would all pass the gate and all hit the LLM provider,
  // running far more provider tokens than the daily credit cap permits. Capping
  // in-flight turns per app bounds that burst. (In-memory, so per instance; a
  // multi-instance deployment needs a shared counter for a global guarantee.)
  maxConcurrentChatsPerApp: Number(
    process.env.MAX_CONCURRENT_CHATS_PER_APP ?? 3
  ),
};

// Models come from kite-service (GET /v1/internal/ai/models), which owns the AI
// configuration in its database and edits it from the admin console. The mounted
// kite.toml [ai] section is only a fallback for when kite-service is unreachable
// at startup. key -> gateway model id, e.g. "minimax-m27" -> "minimax/minimax-m2.7".
function loadModelsFromKiteToml(): LoadedModels {
  try {
    const raw = readFileSync(config.kiteConfigPath, "utf8");
    const cfg = parseToml(raw) as {
      ai?: {
        default_model?: string;
        provider?: {
          model?: { key?: string; name?: string; model?: string; credits?: number }[];
        }[];
      };
    };
    const models: KiteModel[] = [];
    for (const p of cfg.ai?.provider ?? []) {
      for (const m of p.model ?? []) {
        if (m.key && m.model) {
          models.push({ key: m.key, model: m.model, name: m.name || m.key, credits: Number(m.credits) || 0 });
        }
      }
    }
    return { models, defaultKey: cfg.ai?.default_model };
  } catch (err) {
    console.warn(
      `Could not read AI models from ${config.kiteConfigPath}:`,
      err instanceof Error ? err.message : err
    );
    return { models: [] };
  }
}

async function loadModelsFromKiteService(): Promise<LoadedModels | null> {
  const secret = process.env.INTERNAL_SECRET ?? "";
  try {
    const res = await fetch(`${config.kiteApiBaseUrl}/v1/internal/ai/models`, {
      headers: { "X-Internal-Secret": secret },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const loaded = parseKiteModels(await res.json());
    if (!loaded) throw new Error("unexpected answer from kite-service");
    return loaded;
  } catch (err) {
    console.warn(
      "Could not load AI models from kite-service:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// key -> model id the copilot can run. Mutated in place on refresh so existing
// importers always see the current models.
export const MODEL_MAP: Record<string, string> = {};
// The same models for the picker of the website: key, label and credit cost.
export const COPILOT_MODELS: { key: string; name: string; credits: number }[] = [];
let defaultModel = "";

// Only models the copilot can run are kept (see isServable), whatever other
// providers kite-service has configured for the AI nodes of bot flows.
// Default model: accepts either a model KEY or a model id (forgiving). Falls
// back to the first servable model.
function applyModels(loaded: LoadedModels, source: string) {
  const usable = servableModels(loaded.models);

  for (const key of Object.keys(MODEL_MAP)) delete MODEL_MAP[key];
  for (const m of usable) MODEL_MAP[m.key] = m.model;
  COPILOT_MODELS.splice(0, COPILOT_MODELS.length, ...usable.map(({ key, name, credits }) => ({ key, name, credits })));

  const dk = loaded.defaultKey;
  defaultModel =
    (dk && MODEL_MAP[dk]) ||
    (dk && Object.values(MODEL_MAP).includes(dk) ? dk : "") ||
    Object.values(MODEL_MAP)[0] ||
    process.env.DEFAULT_MODEL ||
    "";

  const skipped = loaded.models.length - usable.length;
  console.log(
    `AI models loaded from ${source}: [${Object.keys(MODEL_MAP).join(", ")}] default=${defaultModel || "(none)"}` +
      (skipped > 0 ? ` (${skipped} model(s) of other providers skipped, the copilot only runs DeepSeek)` : "")
  );
}

const MODEL_REFRESH_MS = 60_000;

async function refreshModels(): Promise<boolean> {
  const loaded = await loadModelsFromKiteService();
  if (!loaded) return false;
  applyModels(loaded, "kite-service");
  return true;
}

if (!(await refreshModels())) {
  applyModels(loadModelsFromKiteToml(), "kite.toml (fallback)");
}

setInterval(() => {
  void refreshModels();
}, MODEL_REFRESH_MS).unref();

// resolveModel maps a model KEY (as sent by the editor / Go /ai-models) to its
// gateway model id, falling back to the configured default.
export function resolveModel(key?: string): string {
  if (key && MODEL_MAP[key]) return MODEL_MAP[key];
  return defaultModel;
}
