import { Position } from "@xyflow/react";
import { NodeProps } from "../../lib/flow/dataSchema";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";
import { optionColor } from "@/lib/flow/nodes";

const WEBHOOK_SOURCE_LABELS: Record<string, string> = {
  sepay: "SePay",
  thueapibank: "ThueAPIBank",
  custom_webhook: "Webhook tùy chỉnh",
};

export default function FlowNodeEntryEvent(props: NodeProps) {
  const raw = props.data.event_type as string | undefined;
  const eventName =
    WEBHOOK_SOURCE_LABELS[raw ?? ""] ?? raw?.split("_").join(" ") ?? "";

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
