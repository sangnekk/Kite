import { useCurrentMessage } from "@/lib/message/state";
import CollapsibleSection from "./MessageCollapsibleSection";
import { useShallow } from "zustand/react/shallow";
import { Button } from "../ui/button";
import { getUniqueId } from "@/lib/utils";
import { useCallback } from "react";
import MessageComponentRow from "./MessageComponentRow";
import MessageV2Editor from "./MessageV2Editor";
import { MESSAGE_FLAG_COMPONENTS_V2 } from "@/lib/message/schema";
import MessageInput from "./MessageInput";

export default function MessageComponentsSection({
  disableFlowEditor,
}: {
  disableFlowEditor?: boolean;
}) {
  const isV2 = useCurrentMessage(
    (state) => ((state.flags ?? 0) & MESSAGE_FLAG_COMPONENTS_V2) !== 0
  );
  const setV2Enabled = useCurrentMessage(
    (state) => state.setComponentsV2Enabled
  );

  const components = useCurrentMessage(
    useShallow((state) => state.components.map((e) => (e as any).id))
  );
  const addRow = useCurrentMessage((state) => state.addComponentRow);
  const clearComponents = useCurrentMessage(
    (state) => state.clearComponentRows
  );

  const addButtonRow = useCallback(() => {
    if (components.length >= 5) return;
    addRow({
      id: getUniqueId(),
      type: 1,
      components: [],
    });
  }, [components, addRow]);

  return (
    <CollapsibleSection
      title="Components"
      valiationPathPrefix="components"
      className="space-y-4"
    >
      <MessageInput
        type="toggle"
        label="Use Components V2 (layout, containers, ...)"
        value={isV2}
        onChange={(v) => setV2Enabled(v)}
      />

      {isV2 ? (
        <MessageV2Editor disableFlowEditor={disableFlowEditor} />
      ) : (
        <>
          {components.map((id, i) => (
            <MessageComponentRow
              key={id}
              rowIndex={i}
              rowId={id}
              disableFlowEditor={disableFlowEditor}
            />
          ))}
          <div className="space-x-3">
            <Button onClick={addButtonRow}>Add Button Row</Button>
            <Button onClick={clearComponents} variant="outline">
              Clear Components
            </Button>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
