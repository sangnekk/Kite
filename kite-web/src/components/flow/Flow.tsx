import { FlowContextStoreProvider, FlowContextType } from "@/lib/flow/context";
import { FlowData } from "@/lib/flow/dataSchema";
import { NodeMouseHandler, OnSelectionChangeParams } from "@xyflow/react";
import { useCallback, useState } from "react";
import FlowEditor from "./FlowEditor";
import FlowMenu from "./FlowMenu";
import FlowCopilotPanel from "./FlowCopilotPanel";
import { LogEntry } from "@/lib/types/wire.gen";
import { Button } from "../ui/button";
import { SparklesIcon } from "lucide-react";
import { useAppFeatures } from "@/lib/hooks/api";

interface Props {
  flowData: FlowData;
  logs?: LogEntry[];
  context: FlowContextType;
  onChange: () => void;
}

export default function Flow({ flowData, logs, context, onChange }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const features = useAppFeatures();
  const aiEnabled = !!features?.ai_included;

  // Only *close* the settings panel when the selection is cleared (clicking the
  // canvas, switching tabs, etc.). Opening is driven by an explicit click below,
  // so dragging a node to rearrange it doesn't pop the settings open.
  const onSelectionChange = useCallback(
    ({ nodes }: OnSelectionChangeParams) => {
      if (nodes.length === 0) {
        setSelectedNodeId(null);
      }
    },
    []
  );

  const onNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  return (
    <FlowContextStoreProvider type={context}>
      <div className="flex flex-auto overflow-y-hidden relative">
        <FlowMenu selectedNodeId={selectedNodeId} logs={logs} />

        <div className="flex-auto relative">
          <FlowEditor
            initialData={flowData}
            onChange={onChange}
            onSelectionChange={onSelectionChange}
            onNodeClick={onNodeClick}
          />

          {aiEnabled && !copilotOpen && (
            <Button
              className="absolute top-3 right-3 gap-2 shadow-md"
              size="sm"
              onClick={() => setCopilotOpen(true)}
            >
              <SparklesIcon className="size-4" />
              Trợ lý AI
            </Button>
          )}
        </div>

        {aiEnabled && copilotOpen && (
          <FlowCopilotPanel
            onApplied={onChange}
            onClose={() => setCopilotOpen(false)}
          />
        )}
      </div>
    </FlowContextStoreProvider>
  );
}
