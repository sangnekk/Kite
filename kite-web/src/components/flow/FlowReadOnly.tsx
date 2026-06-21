import { edgeTypes, nodeTypes } from "@/lib/flow/components";
import { getLayoutedElements } from "@/lib/flow/layout";
import { useHookedTheme } from "@/lib/hooks/theme";
import {
  Background,
  BackgroundVariant,
  Edge,
  Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useMemo } from "react";

// FlowReadOnly renders a FlowData as a non-interactive preview canvas (used for
// AI-proposed command/event flows before the user accepts them).
export default function FlowReadOnly({
  nodes,
  edges,
}: {
  nodes: any[];
  edges: any[];
}) {
  const { theme } = useHookedTheme();

  const layouted = useMemo(() => {
    const normalized: Node[] = (nodes ?? []).map((n) => ({
      ...n,
      position: n.position ?? { x: 0, y: 0 },
      data: n.data ?? {},
    }));
    return getLayoutedElements(normalized, (edges ?? []) as Edge[], {
      direction: "TB",
    });
  }, [nodes, edges]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={layouted.nodes}
        edges={layouted.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={theme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        elementsSelectable={false}
        nodesConnectable={false}
        nodesDraggable={false}
        edgesFocusable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
