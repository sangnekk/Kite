import { NodeProps } from "@/lib/flow/dataSchema";
import { suspendColor } from "@/lib/flow/nodes";
import { ComponentData } from "@/lib/types/message.gen";
import { Position, useReactFlow } from "@xyflow/react";
import { ListIcon, MousePointerClickIcon } from "lucide-react";
import { buttonColors } from "../message/MessageComponentButton";
import FlowNodeBase from "./FlowNodeBase";
import FlowNodeHandle from "./FlowNodeHandle";
import { useEffect, useMemo } from "react";
import { isSelectType } from "@/lib/message/schema";
import {
  messageComponentHandleId,
  messageOptionHandleId,
  pruneMessageComponentEdges,
} from "@/lib/flow/selectHandles";

const selectColor = "#5865F2";
const unselectedColor = "#71717a";

// interactiveComponents returns the rows of buttons and select menus of a
// message, including those nested in Components V2 containers.
function interactiveRows(components: ComponentData[]): ComponentData[][] {
  const rows: ComponentData[][] = [];
  const walk = (list: ComponentData[] | undefined) => {
    for (const c of list ?? []) {
      if (c.type === 1 || c.type === undefined || c.type === 0) {
        const interactive = (c.components ?? []).filter(
          (child) =>
            (child.type === 2 && child.style !== 5) || isSelectType(child.type)
        );
        if (interactive.length) rows.push(interactive);
      } else if (c.type === 9 && c.accessory?.type === 2 && c.accessory.style !== 5) {
        rows.push([c.accessory]);
      } else if (c.type === 17) {
        walk(c.components);
      }
    }
  };
  walk(components);
  return rows;
}

function handlesOf(rows: ComponentData[][]): Set<string> {
  const handles = new Set<string>();
  for (const row of rows) {
    for (const comp of row) {
      handles.add(messageComponentHandleId(comp.id!));
      if (comp.type === 3) {
        for (const o of comp.options ?? []) {
          handles.add(messageOptionHandleId(comp.id!, o.id!));
          handles.add(messageOptionHandleId(comp.id!, o.id!, false));
        }
      }
    }
  }
  return handles;
}

export default function FlowNodeActionMessage(props: NodeProps) {
  const rows = useMemo(
    () => interactiveRows(props.data.message_data?.components || []),
    [props.data.message_data]
  );
  const hasComponents = rows.length > 0;

  // Drop the branches of components (or select options) that were removed from
  // the message; they could never run anymore.
  const { setEdges } = useReactFlow();
  const handleKey = useMemo(
    () => Array.from(handlesOf(rows)).sort().join(","),
    [rows]
  );
  useEffect(() => {
    const valid = new Set(handleKey ? handleKey.split(",") : []);
    setEdges((edges) => {
      const pruned = pruneMessageComponentEdges(edges, props.id, valid);
      return pruned.length === edges.length ? edges : pruned;
    });
  }, [handleKey, props.id, setEdges]);

  return (
    <div className="relative">
      <FlowNodeBase
        {...props}
        highlight={hasComponents}
        color={hasComponents ? suspendColor : undefined}
        showId
      >
        <FlowNodeHandle type="target" position={Position.Top} />
        <FlowNodeHandle
          type="source"
          position={hasComponents ? Position.Right : Position.Bottom}
        />
      </FlowNodeBase>

      <div className="flex flex-col mt-2 gap-5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start justify-left gap-2">
            {row.map((comp) =>
              comp.type === 2 ? (
                <ButtonHandle comp={comp} key={comp.id} />
              ) : (
                <SelectHandles comp={comp} key={comp.id} />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonHandle({ comp }: { comp: ComponentData }) {
  const color = buttonColors[(comp.style ?? 1) as keyof typeof buttonColors];

  return (
    <div className="relative">
      <div
        className="px-2 shadow-md rounded-md relative max-w-32 min-w-16 text-center h-8 flex items-center justify-center text-white gap-2"
        style={{
          backgroundColor: color,
        }}
        key={comp.id}
      >
        <MousePointerClickIcon className="w-4 h-4" />
        <div className="text-sm truncate">{comp.label}</div>
      </div>

      <FlowNodeHandle
        type="source"
        position={Position.Bottom}
        id={messageComponentHandleId(comp.id!)}
        size="small"
      />
    </div>
  );
}

// SelectHandles renders a select menu with one branch for "any selection" and,
// for String Selects, a "selected" and a "not selected" branch per option.
function SelectHandles({ comp }: { comp: ComponentData }) {
  const options = comp.type === 3 && !comp.options_source ? comp.options ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          className="px-2 shadow-md rounded-md h-8 flex items-center gap-2 text-white max-w-56"
          style={{ backgroundColor: selectColor }}
          title="Mọi lựa chọn"
        >
          <ListIcon className="w-4 h-4 flex-none" />
          <div className="text-sm truncate">
            {comp.placeholder || "Menu chọn"}
          </div>
        </div>
        <FlowNodeHandle
          type="source"
          position={Position.Bottom}
          id={messageComponentHandleId(comp.id!)}
          size="small"
        />
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-md">
          {options.map((o) => (
            <div key={o.id} className="flex gap-1">
              <OptionChip
                label={o.label || o.value || ""}
                color={selectColor}
                handleId={messageOptionHandleId(comp.id!, o.id!)}
                title={`Khi chọn "${o.label}"`}
              />
              <OptionChip
                label="✕"
                color={unselectedColor}
                handleId={messageOptionHandleId(comp.id!, o.id!, false)}
                title={`Khi không chọn "${o.label}"`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionChip({
  label,
  color,
  handleId,
  title,
}: {
  label: string;
  color: string;
  handleId: string;
  title: string;
}) {
  return (
    <div className="relative" title={title}>
      <div
        className="px-2 h-6 rounded-md shadow-md flex items-center text-white text-xs max-w-28"
        style={{ backgroundColor: color }}
      >
        <span className="truncate">{label}</span>
      </div>
      <FlowNodeHandle type="source" position={Position.Bottom} id={handleId} size="small" color={color} />
    </div>
  );
}
