import { Edge } from "@xyflow/react";
import { FlowData } from "./dataSchema";

// Handle IDs of component and select menu branches. They have to match the
// handles the flow engine executes (kite-service/pkg/flow/component.go).

// A select option's branch on the entry_component_select node.
export function entryOptionHandleId(optionId: number, selected = true) {
  return selected ? `option_${optionId}` : `option_${optionId}_unselected`;
}

// A component's branch on a message node (buttons and "any selection" of a
// select menu).
export function messageComponentHandleId(componentId: number) {
  return `component_${componentId}`;
}

// A select option's branch on a message node.
export function messageOptionHandleId(
  componentId: number,
  optionId: number,
  selected = true
) {
  const base = `component_${componentId}_option_${optionId}`;
  return selected ? base : `${base}_unselected`;
}

const ENTRY_OPTION_HANDLE_RE = /^option_(\d+)(_unselected)?$/;

function isStaleEntryOptionEdge(edge: Edge, optionIds: Set<number>) {
  const match = edge.sourceHandle?.match(ENTRY_OPTION_HANDLE_RE);
  return !!match && !optionIds.has(Number(match[1]));
}

// pruneSelectOptionEdges removes the edges of options that were deleted from
// the select menu of an entry_component_select flow.
export function pruneSelectOptionEdges(
  flow: FlowData,
  optionIds: number[]
): FlowData {
  const ids = new Set(optionIds);
  const edges = flow.edges.filter((e) => !isStaleEntryOptionEdge(e, ids));
  if (edges.length === flow.edges.length) return flow;
  return { ...flow, edges };
}

const MESSAGE_OPTION_HANDLE_RE = /^component_(\d+)_option_(\d+)(_unselected)?$/;
const MESSAGE_COMPONENT_HANDLE_RE = /^component_(\d+)$/;

// pruneMessageComponentEdges removes the edges of components (and select
// options) that no longer exist on a message node. validHandles contains the
// handles the node currently renders.
export function pruneMessageComponentEdges(
  edges: Edge[],
  nodeId: string,
  validHandles: Set<string>
): Edge[] {
  return edges.filter((e) => {
    if (e.source !== nodeId || !e.sourceHandle) return true;
    const isComponentHandle =
      MESSAGE_OPTION_HANDLE_RE.test(e.sourceHandle) ||
      MESSAGE_COMPONENT_HANDLE_RE.test(e.sourceHandle);
    return !isComponentHandle || validHandles.has(e.sourceHandle);
  });
}
