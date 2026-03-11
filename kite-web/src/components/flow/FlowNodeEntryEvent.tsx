import { Position } from "@xyflow/react";
import { NodeProps } from "../../lib/flow/dataSchema";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";
import { optionColor } from "@/lib/flow/nodes";

export default function FlowNodeEntryEvent(props: NodeProps) {
  const eventName = props.data.event_type?.split("_").join(" ") || "";

  return (
    <FlowNodeBase
      {...props}
      title={`Lắng nghe ${eventName}`}
      description={`Lắng nghe sự kiện ${eventName} để kích hoạt luồng. Thả các hành động khác vào đây!`}
      highlight={true}
      showConnectedMarker={false}
    >
      <FlowNodeHandle
        type="target"
        position={Position.Top}
        color={optionColor}
      />
      <FlowNodeHandle type="source" position={Position.Bottom} />
    </FlowNodeBase>
  );
}
