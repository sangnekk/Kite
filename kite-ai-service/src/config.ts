import { readFileSync } from "node:fs";
import { parse as parseToml } from "smol-toml";

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
};

// Models are read from kite.toml [ai] so the service uses exactly the models the
// operator configured (key -> Vercel AI Gateway model id), with no hardcoding.
type LoadedModels = { map: Record<string, string>; defaultKey?: string };

function loadModelsFromKiteToml(): LoadedModels {
  try {
    const raw = readFileSync(config.kiteConfigPath, "utf8");
    const cfg = parseToml(raw) as {
      ai?: {
        default_model?: string;
        provider?: { model?: { key?: string; model?: string }[] }[];
      };
    };
    const map: Record<string, string> = {};
    for (const p of cfg.ai?.provider ?? []) {
      for (const m of p.model ?? []) {
        if (m.key && m.model) map[m.key] = m.model;
      }
    }
    return { map, defaultKey: cfg.ai?.default_model };
  } catch (err) {
    console.warn(
      `Could not read AI models from ${config.kiteConfigPath}:`,
      err instanceof Error ? err.message : err
    );
    return { map: {} };
  }
}

const loaded = loadModelsFromKiteToml();

// key -> gateway model id (e.g. "minimax-m27" -> "minimax/minimax-m2.7").
export const MODEL_MAP: Record<string, string> = loaded.map;

// Default model: kite.toml default_model, accepting either a model KEY or a
// gateway model id (forgiving). Falls back to the first configured model.
const dk = loaded.defaultKey;
const defaultModel =
  (dk && MODEL_MAP[dk]) ||
  (dk && Object.values(MODEL_MAP).includes(dk) ? dk : "") ||
  Object.values(MODEL_MAP)[0] ||
  process.env.DEFAULT_MODEL ||
  "";

console.log(
  `AI models loaded from kite.toml: [${Object.keys(MODEL_MAP).join(", ")}] default=${defaultModel || "(none)"}`
);

// resolveModel maps a model KEY (as sent by the editor / Go /ai-models) to its
// gateway model id, falling back to the configured default.
export function resolveModel(key?: string): string {
  if (key && MODEL_MAP[key]) return MODEL_MAP[key];
  return defaultModel;
}
