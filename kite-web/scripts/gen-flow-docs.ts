// Generates a per-block "usage knowledge" file (flow-node-docs.json) by
// extracting the human-written prose from the docs site
// (kite-docs/docs/reference/blocks/**/*.md) and writing it into kite-ai-service.
//
// This is the rich guidance the compact catalog (flow-nodes.json) leaves out:
// "when to use", per-field explanations, examples, gotchas and related blocks.
// The AI agent retrieves it ON DEMAND, one block at a time, via get_node_details
// — so the full corpus never has to sit in the system prompt.
//
// Run with Bun: `bun run scripts/gen-flow-docs.ts` (or `npm run gen:docs`).
// Regenerate whenever the block reference docs change.

import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BLOCKS_DIR = path.join(__dirname, "../../kite-docs/docs/reference/blocks");
const CATALOG_PATH = path.join(__dirname, "../../kite-ai-service/src/generated/flow-nodes.json");
const OUT_PATH = path.join(__dirname, "../../kite-ai-service/src/generated/flow-node-docs.json");

// Recursively collect every .md file under the blocks reference dir.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

// cleanProse strips the Docusaurus scaffolding (frontmatter, JS imports, the
// <EmbedFlowNode>/<NodeInfoExplorer> JSX widgets) and returns just the readable
// markdown prose — the part that actually teaches how to use the block.
function cleanProse(raw: string): string {
  let body = raw;
  // Drop YAML frontmatter (--- ... ---) at the top.
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(body.indexOf("\n", end + 1) + 1);
  }
  const lines = body.split(/\r?\n/).filter((l) => {
    const t = l.trim();
    if (t.startsWith("import ")) return false; // ES imports of doc components
    if (t.startsWith("<EmbedFlowNode")) return false; // live node preview widget
    if (t.startsWith("<NodeInfoExplorer")) return false; // schema explorer widget
    return true;
  });
  // Collapse runs of blank lines to a single one and trim the edges.
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// The block type is encoded in <EmbedFlowNode type="..."/>; fall back to the
// filename (which equals the type for every block doc) and warn on mismatch.
function typeFor(file: string, raw: string): string {
  const fromFile = path.basename(file, ".md");
  const m = raw.match(/<EmbedFlowNode\s+type="([^"]+)"/);
  if (m && m[1] !== fromFile) {
    console.warn(`  ! ${path.basename(file)}: EmbedFlowNode type "${m[1]}" != filename "${fromFile}"`);
  }
  return m?.[1] ?? fromFile;
}

const catalogTypes = new Set<string>(
  (JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as { nodes: { type: string }[] }).nodes.map(
    (n) => n.type
  )
);

const docs: Record<string, string> = {};
for (const file of walk(BLOCKS_DIR)) {
  if (path.basename(file) === "index.md") continue; // section landing page, not a block
  const raw = readFileSync(file, "utf8");
  const type = typeFor(file, raw);
  const prose = cleanProse(raw);
  if (prose) docs[type] = prose;
}

// Report coverage so missing/extra docs are visible when regenerating.
const documented = new Set(Object.keys(docs));
const missing = [...catalogTypes].filter((t) => !documented.has(t)).sort();
const orphan = [...documented].filter((t) => !catalogTypes.has(t)).sort();
console.log(`Extracted docs for ${documented.size} blocks (catalog has ${catalogTypes.size}).`);
if (missing.length) console.log(`  Blocks WITHOUT docs (${missing.length}): ${missing.join(", ")}`);
if (orphan.length) console.log(`  Docs with no matching block (${orphan.length}): ${orphan.join(", ")}`);

mkdirSync(path.dirname(OUT_PATH), { recursive: true });
// Sorted keys -> stable diffs across regenerations.
const sorted = Object.fromEntries(Object.keys(docs).sort().map((k) => [k, docs[k]]));
writeFileSync(OUT_PATH, JSON.stringify({ docs: sorted }, null, 2) + "\n");
console.log(`Wrote ${documented.size} block docs -> ${OUT_PATH}`);
