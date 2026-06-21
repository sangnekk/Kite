import { HistoryIcon, Trash2Icon } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
}

interface Props {
  conversations: Conversation[];
  conversationId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// ConversationHistoryMenu is the saved-chat picker shared by the flow copilot
// and the AI Studio: a dropdown listing past conversations with per-row delete.
export default function ConversationHistoryMenu({
  conversations,
  conversationId,
  onSelect,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Lịch sử đoạn chat">
          <HistoryIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuLabel>Lịch sử đoạn chat</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {conversations.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Chưa có đoạn chat nào được lưu.
          </div>
        ) : (
          conversations.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => onSelect(c.id)}
              className="group flex items-center gap-2"
            >
              <span
                className={`flex-auto truncate ${
                  c.id === conversationId ? "font-semibold text-primary" : ""
                }`}
              >
                {c.title || "Đoạn chat"}
              </span>
              <button
                type="button"
                className="flex-none rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                title="Xóa"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(c.id);
                }}
              >
                <Trash2Icon className="size-4" />
              </button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
