// Generates a canonical "block knowledge" catalog (flow-nodes.json) from the
// flow editor's source of truth (nodes.ts + categories.ts + zod schemas) and
// writes it into kite-ai-service so the AI agent always knows every block.
//
// Run with Bun (handles TS + tsconfig paths): `bun run scripts/gen-flow-catalog.ts`
// (or `npm run gen:catalog`). Regenerate whenever flow nodes/schemas change.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { nodeCategories } from "../src/lib/flow/categories";
import { nodeTypes } from "../src/lib/flow/nodes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Nodes that store a non-object result at runtime (backend StoreNodeResult).
// Nodes with a resultSchema are objects and handled automatically.
const primitiveResultKind: Record<string, string> = {
  action_ai_chat_completion: "string",
  action_ai_web_search: "string",
  action_random_generate: "number",
  action_expression_evaluate: "any",
  action_variable_set: "any",
  action_variable_get: "any",
  action_balance_get: "number",
  action_balance_add: "number",
  action_balance_remove: "number",
  action_balance_set: "number",
  action_balance_transfer: "object",
  action_balance_leaderboard: "list",
  action_time_now: "string",
  action_list_pick: "any",
  action_text_transform: "string",
  action_json_parse: "any",
  action_json_build: "string",
  action_cooldown_check: "object",
  action_number_format: "string",
  action_list_format: "string",
  action_list_join: "string",
  action_list_length: "number",
  action_message_purge: "number",
  control_error_handler: "string",
};

const catByType: Record<
  string,
  { category: string; section: string; contextTypes: string[] | null }
> = {};
for (const [category, sections] of Object.entries(nodeCategories)) {
  for (const s of sections) {
    for (const t of s.nodeTypes) {
      catByType[t] = { category, section: s.title, contextTypes: s.contextTypes };
    }
  }
}

function categoryOf(type: string) {
  if (catByType[type]) return catByType[type];
  if (type.startsWith("entry_"))
    return { category: "entry", section: "Khởi đầu", contextTypes: null };
  // condition items, loop each/end, etc. — structural children of control nodes
  return { category: "control_flow", section: "Cấu trúc con", contextTypes: null };
}

function creditsOf(v: any): number | null {
  try {
    return typeof v.creditsCost === "function"
      ? v.creditsCost({})
      : v.creditsCost ?? null;
  } catch {
    return null;
  }
}

const nodes = Object.entries(nodeTypes).map(([type, v]: [string, any]) => {
  const cat = categoryOf(type);
  return {
    type,
    category: cat.category,
    section: cat.section,
    contextTypes: cat.contextTypes,
    title: v.defaultTitle,
    description: v.defaultDescription,
    icon: v.icon,
    color: v.color,
    dataFields: v.dataFields ?? [],
    dataSchema: v.dataSchema
      ? zodToJsonSchema(v.dataSchema, { $refStrategy: "none" })
      : null,
    resultSchema: v.resultSchema
      ? zodToJsonSchema(v.resultSchema, { $refStrategy: "none" })
      : null,
    producesResult: !!v.resultSchema || type in primitiveResultKind,
    resultKind: v.resultSchema ? "object" : primitiveResultKind[type] ?? null,
    ownsChildren: v.ownsChildren ?? false,
    creditsCost: creditsOf(v),
  };
});

const payload = JSON.stringify({ nodes }, null, 2) + "\n";

// Consumers of the catalog. Each gets the exact same file so they can never
// drift from the flow editor's source of truth.
const outputs = [
  // AI agent (microservice) — needs to know every block.
  "../../kite-ai-service/src/generated/flow-nodes.json",
  // Docs site (Docusaurus) — served as a static asset so NodeInfoExplorer can
  // render node schemas without a running Next.js backend (embed/static build).
  "../../kite-docs/static/flow-nodes.json",
];

for (const rel of outputs) {
  const out = path.join(__dirname, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, payload);
  console.log(`Wrote ${nodes.length} nodes -> ${out}`);
}
