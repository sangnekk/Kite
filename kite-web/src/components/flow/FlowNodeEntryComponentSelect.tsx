import { Position } from "@xyflow/react";
import { NodeProps } from "@/lib/flow/dataSchema";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";
import { entryColor } from "@/lib/flow/nodes";
import { FlowComponentOption, useFlowComponentOptions } from "@/lib/flow/context";
import { entryOptionHandleId } from "@/lib/flow/selectHandles";

const unselectedColor = "#71717a";

// The entry of a select menu flow. The default output ("any selection") runs
// first, then the branch of every selected option and the "not selected"
// branch of every other option (see kite-service/pkg/flow/component.go).
export default function FlowNodeEntryComponentSelect(props: NodeProps) {
  const options = useFlowComponentOptions();

  return (
    <div className="relative">
      <FlowNodeBase {...props} highlight={true} showConnectedMarker={false}>
        <FlowNodeHandle type="source" position={Position.Bottom} />
      </FlowNodeBase>

      {options.length > 0 && (
        <div className="mt-3 space-y-3">
          <OptionRow
            title="Khi chọn"
            options={options}
            selected
            color={entryColor}
          />
          <OptionRow
            title="Khi không chọn"
            options={options}
            selected={false}
            color={unselectedColor}
          />
        </div>
      )}
    </div>
  );
}

function OptionRow({
  title,
  options,
  selected,
  color,
}: {
  title: string;
  options: FlowComponentOption[];
  selected: boolean;
  color: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {title}
      </div>
      <div className="flex flex-wrap gap-2 max-w-md">
        {options.map((option) => (
          <div key={option.id} className="relative">
            <div
              className="px-2 h-7 rounded-md shadow-md flex items-center gap-1.5 text-white text-xs max-w-36"
              style={{ backgroundColor: color, opacity: selected ? 1 : 0.8 }}
              title={`${option.label} (${option.value})`}
            >
              {option.emoji && <span>{option.emoji}</span>}
              <span className="truncate">{option.label || option.value}</span>
            </div>
            <FlowNodeHandle
              type="source"
              position={Position.Bottom}
              id={entryOptionHandleId(option.id, selected)}
              size="small"
              color={color}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
