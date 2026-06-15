import { Position } from "@xyflow/react";
import { NodeProps } from "@/lib/flow/dataSchema";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";
import { optionColor } from "@/lib/flow/nodes";

export default function FlowNodeEntryCommand(props: NodeProps) {
  const name = props.data.name || "";
  // Reflect the command's trigger types (slash defaults to on; prefix is opt-in).
  const slash = !props.data.command_disable_slash;
  const prefix = !!props.data.command_enable_prefix;
  const title =
    [slash ? `/${name}` : null, prefix ? `!${name}` : null]
      .filter(Boolean)
      .join("  ·  ") || `/${name}`;

  return (
    <FlowNodeBase
      {...props}
      title={title}
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
