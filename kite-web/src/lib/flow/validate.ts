import { Edge, Node, useEdges, useNodes } from "@xyflow/react";
import { useMemo } from "react";
import { getNodeValues } from "./nodes";
import { NodeData } from "./dataSchema";

export type FlowIssueKind = "disconnected" | "config";

export interface FlowIssue {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  kind: FlowIssueKind;
  message: string;
}

function getNodeLabel(node: Node): string {
  const data = node.data as NodeData | undefined;
  const values = getNodeValues(node.type!);
  return (data?.custom_label as string) || values.defaultTitle || node.type!;
}

// Entry nodes are roots; option nodes attach *into* an entry (the edge points
// option -> entry), so neither needs to be reachable from an entry node.
function isRootNode(type: string): boolean {
  return type.startsWith("entry") || type.startsWith("option");
}

/**
 * Validates a flow's structure and returns human-friendly issues. Only
 * structural checks are done here (no template evaluation): nodes that aren't
 * reachable from an entry (a forgotten connection) and nodes that are missing
 * required configuration.
 */
export function validateFlow(nodes: Node[], edges: Edge[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  if (nodes.length === 0) return issues;

  // Build adjacency (source -> targets) for a forward walk from the entries.
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source);
    if (list) list.push(edge.target);
    else adjacency.set(edge.source, [edge.target]);
  }

  // BFS reachability starting from every entry node.
  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const node of nodes) {
    if (node.type?.startsWith("entry")) {
      reachable.add(node.id);
      queue.push(node.id);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  for (const node of nodes) {
    const type = node.type!;
    const values = getNodeValues(type);
    const label = getNodeLabel(node);

    // Forgotten connection: a non-root node that no entry can reach.
    if (!isRootNode(type) && !reachable.has(node.id)) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        nodeType: type,
        kind: "disconnected",
        message: `Khối «${label}» chưa được nối vào luồng nên sẽ không bao giờ chạy. Hãy kéo một đường nối từ khối trước đó tới nó.`,
      });
    }

    // Missing/invalid required configuration.
    if (values.dataSchema && !values.dataSchema.safeParse(node.data).success) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        nodeType: type,
        kind: "config",
        message: `Khối «${label}» còn thiếu hoặc sai cấu hình bắt buộc. Hãy mở khối và điền các trường còn trống.`,
      });
    }
  }

  return issues;
}

/** Live validation issues for the flow currently rendered in the editor. */
export function useFlowIssues(): FlowIssue[] {
  const nodes = useNodes();
  const edges = useEdges();
  return useMemo(() => validateFlow(nodes, edges), [nodes, edges]);
}

/** Validation issues that belong to a single node. */
export function useNodeIssues(nodeId: string): FlowIssue[] {
  const issues = useFlowIssues();
  return useMemo(
    () => issues.filter((issue) => issue.nodeId === nodeId),
    [issues, nodeId]
  );
}
