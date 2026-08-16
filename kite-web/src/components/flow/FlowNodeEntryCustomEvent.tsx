import { NodeProps } from "@/lib/flow/dataSchema";
import { useCustomEvents } from "@/lib/hooks/api";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";

export default function FlowNodeEntryCustomEvent(props: NodeProps) {
  const events = useCustomEvents() ?? [];
  const event = events.find((item) => item?.id === props.data.custom_event_id);
  const name = event?.name ?? "event chưa xác định";

  return (
    <FlowNodeBase
      {...props}
      title={<span className="font-mono">{name}</span>}
      description="Chạy khi event nội bộ này được phát."
      highlight
      showConnectedMarker={false}
    >
      <FlowNodeHandle type="source" position={Position.Bottom} />
    </FlowNodeBase>
  );
}
import { Position } from "@xyflow/react";
