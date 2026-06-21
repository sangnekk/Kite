import catalogJson from "./generated/flow-nodes.json";

export type CatalogNode = {
  type: string;
  category: string;
  section: string;
  contextTypes: string[] | null;
  title: string;
  description: string;
  icon: string;
  color: string;
  dataFields: string[];
  dataSchema: unknown | null;
  resultSchema: unknown | null;
  producesResult: boolean;
  resultKind: string | null;
  ownsChildren: boolean;
  creditsCost: number | null;
};

const nodes: CatalogNode[] = (catalogJson as { nodes: CatalogNode[] }).nodes;
const byType = new Map(nodes.map((n) => [n.type, n]));

const NOISE_FIELDS = new Set(["custom_label", "result_key", "temporary_name"]);

// fieldList returns the ACTUAL data field names from the node's JSON schema
// (data.<field>), marking required ones with *. Falls back to dataFields (the
// editor input keys) only when no schema is present. Using the schema avoids
// teaching the model wrong field names (e.g. condition_base_value).
function fieldList(n: CatalogNode): string[] {
  const ds = n.dataSchema as { properties?: Record<string, unknown>; required?: string[] } | null;
  if (ds?.properties) {
    const req = new Set(ds.required ?? []);
    return Object.keys(ds.properties)
      .filter((k) => !NOISE_FIELDS.has(k))
      .map((k) => (req.has(k) ? `${k}*` : k));
  }
  return n.dataFields.filter((f) => !NOISE_FIELDS.has(f));
}

// buildCatalogText renders a compact, grouped list of every block for the
// system prompt: what it does, its exact input fields (*=required), whether it
// produces a reusable result, and any context restriction.
export function buildCatalogText(): string {
  const groups: Record<string, CatalogNode[]> = {};
  for (const n of nodes) (groups[n.category] ??= []).push(n);

  const order = ["entry", "option", "action", "data", "control_flow"];
  const cats = Object.keys(groups).sort(
    (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)
  );

  const lines: string[] = [];
  for (const cat of cats) {
    lines.push(`\n### ${cat}`);
    for (const n of groups[cat]) {
      const fields = fieldList(n);
      const parts = [`${n.type} — ${n.title}: ${n.description}`];
      if (fields.length) parts.push(`inputs: ${fields.join(", ")}`);
      if (n.producesResult) parts.push(`produces ${n.resultKind} (set temporary_name to reuse)`);
      if (n.contextTypes) parts.push(`only in: ${n.contextTypes.join("/")}`);
      lines.push(`- ${parts.join(" | ")}`);
    }
  }
  return lines.join("\n");
}

// nodeDetails returns the full input/result schema for a single block, used by
// the get_node_details tool so the agent can drill in without bloating the prompt.
export function nodeDetails(type: string): object | null {
  const n = byType.get(type);
  if (!n) return null;
  return {
    type: n.type,
    title: n.title,
    description: n.description,
    contextTypes: n.contextTypes,
    dataFields: n.dataFields,
    dataSchema: n.dataSchema,
    resultSchema: n.resultSchema,
    producesResult: n.producesResult,
    resultKind: n.resultKind,
  };
}

export function hasNode(type: string): boolean {
  return byType.has(type);
}
