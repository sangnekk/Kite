import { useCurrentFlow, useCurrentMessage } from "@/lib/message/state";
import { useShallow } from "zustand/react/shallow";
import { Card } from "../ui/card";
import MessageCollapsibleSection from "./MessageCollapsibleSection";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { getUniqueId } from "@/lib/utils";
import MessageComponentButton from "./MessageComponentButton";
import MessageComponentSelectMenu from "./MessageComponentSelectMenu";
import { MessageComponentActionRow, isSelectType } from "@/lib/message/schema";
import { selectTypeLabel } from "@/lib/message/select";

export default function MessageComponentRow({
  rowIndex,
  rowId,
  disableFlowEditor,
}: {
  rowIndex: number;
  rowId: number;
  disableFlowEditor?: boolean;
}) {
  const rowCount = useCurrentMessage((state) => state.components.length);
  const components = useCurrentMessage(
    useShallow((state) =>
      (state.components[rowIndex] as MessageComponentActionRow).components.map(
        (c) => c.id
      )
    )
  );
  // A row holds either buttons or a single select menu (Discord's layout rule),
  // so the first component decides what the row is.
  const selectType = useCurrentMessage((state) => {
    const first = (state.components[rowIndex] as MessageComponentActionRow)
      .components[0];
    return first && isSelectType(first.type) ? first.type : null;
  });
  const [moveUp, moveDown, duplicate, remove] = useCurrentMessage(
    useShallow((state) => [
      state.moveComponentRowUp,
      state.moveComponentRowDown,
      state.duplicateComponentRow,
      state.deleteComponentRow,
    ])
  );
  const cloneFlows = useCurrentFlow((s) => s.cloneFlows);

  const [addButton, clearButtons] = useCurrentMessage(
    useShallow((state) => [state.addButton, state.clearButtons])
  );

  const title =
    selectType !== null
      ? `Hàng ${rowIndex + 1} · Menu chọn (${selectTypeLabel(selectType)})`
      : `Hàng ${rowIndex + 1} · Nút`;

  return (
    <Card className="px-4 py-3">
      <MessageCollapsibleSection
        title={title}
        size="lg"
        valiationPathPrefix={`components.${rowIndex}`}
        actions={
          <>
            {rowIndex > 0 && (
              <ChevronUpIcon
                className="h-6 w-6"
                onClick={() => moveUp(rowIndex)}
                role="button"
              />
            )}
            {rowIndex < rowCount - 1 && (
              <ChevronDownIcon
                className="h-6 w-6"
                onClick={() => moveDown(rowIndex)}
                role="button"
              />
            )}
            {rowCount < 5 && (
              <CopyIcon
                className="h-5 w-5"
                onClick={() => cloneFlows(duplicate(rowIndex))}
                role="button"
              />
            )}
            <TrashIcon
              className="h-5 w-5"
              onClick={() => remove(rowIndex)}
              role="button"
            />
          </>
        }
        className="space-y-3"
      >
        {selectType !== null ? (
          <>
            <div className="text-sm text-muted-foreground">
              Menu chọn chiếm trọn một hàng; không thể thêm nút vào hàng này.
            </div>
            <MessageComponentSelectMenu
              path={[rowIndex, 0]}
              disableFlowEditor={disableFlowEditor}
            />
          </>
        ) : (
          <>
            {components.map((id, i) => (
              <MessageComponentButton
                key={id}
                rowIndex={rowIndex}
                rowId={rowId}
                compIndex={i}
                compId={id}
                disableFlowEditor={disableFlowEditor}
              />
            ))}
            <div className="space-x-3">
              <Button
                onClick={() =>
                  addButton(rowIndex, {
                    id: getUniqueId(),
                    type: 2,
                    style: 2,
                    label: "",
                    flow_source_id: getUniqueId().toString(),
                  })
                }
                size="sm"
                disabled={components.length >= 5}
              >
                Thêm nút
              </Button>
              <Button
                onClick={() => clearButtons(rowIndex)}
                variant="destructive"
                size="sm"
              >
                Xóa các nút
              </Button>
            </div>
          </>
        )}
      </MessageCollapsibleSection>
    </Card>
  );
}
