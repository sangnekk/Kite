import { CodeIcon, PaintbrushIcon } from "lucide-react";
import { useCurrentMessage } from "@/lib/message/state";
import { useShallow } from "zustand/react/shallow";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MessageControlsButton from "./MessageControlsButton";
import MessageControlsUndo from "./MessageControlsUndo";
import MessageJSONDialog from "./MessageJSONDialog";

export default function MessageControls() {
  const [clearMessage, resetMessage] = useCurrentMessage(
    useShallow((state) => [state.clear, state.reset])
  );

  return (
    <div className="flex items-center justify-between space-x-3">
      <div className="flex items-center space-x-3">
        <MessageControlsUndo />
      </div>
      <div className="flex items-center space-x-3">
        <MessageJSONDialog>
          <MessageControlsButton
            icon={CodeIcon}
            label="Mã JSON"
            onClick={() => {}}
          />
        </MessageJSONDialog>
        <ConfirmDialog
          title="Bạn có chắc muốn xóa tin nhắn không?"
          description="Thao tác này sẽ xóa mọi thứ và không thể hoàn tác."
          onConfirm={clearMessage}
        >
          <MessageControlsButton
            icon={PaintbrushIcon}
            label="Xóa tin nhắn"
            onClick={() => {}}
          />
        </ConfirmDialog>
      </div>
    </div>
  );
}
