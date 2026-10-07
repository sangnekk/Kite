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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PlusIcon } from "lucide-react";
import { newSelectRow } from "@/lib/message/select";

const MAX_ROWS = 5;

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
    if (components.length >= MAX_ROWS) return;
    addRow({
      id: getUniqueId(),
      type: 1,
      components: [],
    });
  }, [components, addRow]);

  // A select menu always gets its own row: Discord doesn't allow it to share a
  // row with buttons or another select.
  const addSelectRow = useCallback(() => {
    if (components.length >= MAX_ROWS) return;
    addRow(newSelectRow());
  }, [components, addRow]);

  return (
    <CollapsibleSection
      title="Thành phần"
      valiationPathPrefix="components"
      className="space-y-4"
    >
      <MessageInput
        type="toggle"
        label="Dùng Components V2 (bố cục, khung chứa, ...)"
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
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={components.length >= MAX_ROWS}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Thêm thành phần
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={addButtonRow}>Hàng nút</DropdownMenuItem>
                <DropdownMenuItem onClick={addSelectRow}>Menu chọn</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={clearComponents} variant="outline">
              Xóa thành phần
            </Button>
            <div className="text-sm text-muted-foreground">
              {components.length}/{MAX_ROWS} hàng
            </div>
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
