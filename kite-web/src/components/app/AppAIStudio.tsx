import { useAIConversations } from "@/lib/ai/useAIConversations";
import { cn } from "@/lib/utils";
import {
  useCommandCreateMutation,
  useEventListenerCreateMutation,
  useMessageCreateMutation,
} from "@/lib/api/mutations";
import { useAICreditsQuery } from "@/lib/api/queries";
import { useAIModels } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { CheckIcon, SparklesIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ConversationHistoryMenu from "../ai/ConversationHistoryMenu";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import Markdown from "../common/Markdown";
import FlowReadOnly from "../flow/FlowReadOnly";
import MessagePreview from "../message/MessagePreview";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:3001";

type ButtonSpec = {
  label: string;
  style?: "primary" | "secondary" | "success" | "danger";
  flow: any;
};

type Proposal = {
  id: string;
  kind: "command" | "event_listener" | "message";
  title: string;
  flow?: { nodes: any[]; edges: any[] };
  messageData?: any;
  flowSources?: Record<string, any>;
  name?: string;
};

const STYLE_NUM: Record<string, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
};

// Build Discord MessageData (action rows of buttons) + flow_sources from the
// agent's simple buttons list. Mirrors the ai-service create_message builder.
function buildMessageData(content: string | undefined, buttons?: ButtonSpec[]) {
  const flowSources: Record<string, any> = {};
  const buttonComponents = (buttons ?? []).map((b) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    flowSources[id] = b.flow;
    return {
      type: 2,
      style: STYLE_NUM[b.style ?? "primary"],
      label: b.label,
      flow_source_id: id,
    };
  });
  const components: any[] = [];
  for (let i = 0; i < buttonComponents.length; i += 5) {
    components.push({ type: 1, components: buttonComponents.slice(i, i + 5) });
  }
  return {
    data: { content: content ?? "", components, embeds: [], attachments: [] },
    flowSources,
  };
}

function entryName(flow: { nodes: any[] }, type: string, fallback: string) {
  const n = flow?.nodes?.find((x) => x.type === type);
  return n?.data?.name || n?.data?.event_type || fallback;
}

// All studio conversations share one context bucket per app.
const STUDIO_CONTEXT = "studio";

export default function AppAIStudio() {
  const appId = useAppId();

  const models = useAIModels();
  const creditsQuery = useAICreditsQuery(appId);
  const credits = creditsQuery.data?.success ? creditsQuery.data.data : undefined;

  const [input, setInput] = useState("");
  const [model, setModel] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  // On small screens chat and preview are shown one at a time via a tab switch.
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");

  const cmdCreate = useCommandCreateMutation(appId);
  const evtCreate = useEventListenerCreateMutation(appId);
  const msgCreate = useMessageCreateMutation(appId);

  const { messages, setMessages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_SERVICE_URL}/chat`,
      credentials: "include",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const stage = (p: Omit<Proposal, "id">) => {
        setProposals((prev) => [...prev, { id: toolCall.toolCallId, ...p }]);
        // Surface the new preview on mobile (no-op on desktop where both show).
        setMobileTab("preview");
        addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: { staged: true },
        });
      };
      const input = toolCall.input as any;
      if (toolCall.toolName === "propose_command") {
        stage({
          kind: "command",
          title: `/${entryName(input.flow, "entry_command", "command")}`,
          flow: input.flow,
        });
      } else if (toolCall.toolName === "propose_event_listener") {
        stage({
          kind: "event_listener",
          title: `Sự kiện: ${entryName(input.flow, "entry_event", "event")}`,
          flow: input.flow,
        });
      } else if (toolCall.toolName === "propose_message") {
        const { data, flowSources } = buildMessageData(
          input.content,
          input.buttons
        );
        stage({
          kind: "message",
          title: `Tin nhắn: ${input.name}`,
          name: input.name,
          messageData: data,
          flowSources,
        });
      }
    },
    onError: (e) => toast.error(`Trợ lý lỗi: ${e.message}`),
    onFinish: () => creditsQuery.refetch(),
  });

  const busy = status === "submitted" || status === "streaming";

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const {
    conversations,
    conversationId,
    newChat,
    selectConversation,
    deleteConversation,
  } = useAIConversations({
    appId,
    context: STUDIO_CONTEXT,
    messages,
    setMessages,
    status,
    onReset: () => setProposals([]),
  });

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage(
      { text },
      { body: { appId, mode: "page", context: "page", flow: null, model: model || undefined } }
    );
  }, [input, busy, sendMessage, appId, model]);

  const removeProposal = (id: string) =>
    setProposals((prev) => prev.filter((p) => p.id !== id));

  const accept = useCallback(
    async (p: Proposal) => {
      try {
        let res: any;
        if (p.kind === "command") {
          res = await cmdCreate.mutateAsync({
            flow_source: p.flow as any,
            enabled: true,
          });
        } else if (p.kind === "event_listener") {
          res = await evtCreate.mutateAsync({
            source: "discord",
            flow_source: p.flow as any,
            enabled: true,
          });
        } else {
          res = await msgCreate.mutateAsync({
            name: p.name ?? "AI message",
            description: null,
            data: p.messageData,
            flow_sources: p.flowSources ?? {},
          } as any);
        }
        if (res?.success) {
          toast.success("Đã tạo!");
          removeProposal(p.id);
        } else {
          toast.error(`Không tạo được: ${res?.error?.message ?? "lỗi"}`);
        }
      } catch (e) {
        toast.error(`Không tạo được: ${String(e)}`);
      }
    },
    [cmdCreate, evtCreate, msgCreate]
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      {/* Mobile tab switch (chat / preview) */}
      <div className="flex flex-none border-b border-border md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium",
            mobileTab === "chat"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          )}
        >
          Trò chuyện
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium",
            mobileTab === "preview"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          )}
        >
          Xem trước
          {proposals.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
              {proposals.length}
            </span>
          )}
        </button>
      </div>

      {/* Chat */}
      <div
        className={cn(
          "min-h-0 w-full flex-auto flex-col border-border md:flex md:w-[340px] md:flex-none md:border-r lg:w-[400px]",
          mobileTab === "chat" ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
          <SparklesIcon className="size-5 text-primary" />
          <div className="flex-auto">
            <div className="font-bold leading-tight text-foreground">
              AI Studio
            </div>
            {credits && (
              <div className="text-xs text-muted-foreground">
                Còn {credits.remaining}/{credits.limit_per_day} credit AI hôm nay
              </div>
            )}
          </div>
          <ConversationHistoryMenu
            conversations={conversations}
            conversationId={conversationId}
            onSelect={selectConversation}
            onDelete={deleteConversation}
          />
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              title="Đoạn chat mới"
              onClick={newChat}
              disabled={busy}
            >
              <SquarePenIcon className="size-5" />
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-auto overflow-y-auto">
          <div className="space-y-3 p-3 sm:p-4">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Mô tả thứ bạn muốn tạo, ví dụ: &quot;tạo lệnh /ping trả lời
                Pong&quot;, &quot;welcomer chào thành viên mới ở kênh
                #welcome&quot;, &quot;mẫu tin nhắn có 2 nút&quot;. AI sẽ dựng và
                hiện bản xem trước để bạn Chấp nhận.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <div
                        key={i}
                        className="ml-6 whitespace-pre-wrap rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
                      >
                        {part.text}
                      </div>
                    ) : (
                      <div
                        key={i}
                        className="mr-6 rounded-lg bg-muted px-3 py-2 text-foreground"
                      >
                        <Markdown>{part.text}</Markdown>
                      </div>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const tp = part as any;
                    return (
                      <Tool key={i} className="mr-6">
                        <ToolHeader type={tp.type} state={tp.state} />
                        <ToolContent>
                          {tp.input != null && <ToolInput input={tp.input} />}
                          {(tp.output != null || tp.errorText) && (
                            <ToolOutput output={tp.output} errorText={tp.errorText} />
                          )}
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
            {busy && (
              <div className="mr-6 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Đang suy nghĩ…
              </div>
            )}
          </div>
        </div>

        <div className="flex-none space-y-2 border-t border-border p-3">
          {models && models.length > 0 && (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Mô hình mặc định" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m!.key} value={m!.key}>
                    {m!.credits ? `${m!.name} (${m!.credits} credit)` : m!.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Nhập yêu cầu… (Enter để gửi)"
            className="min-h-[60px] resize-none"
          />
          <Button
            className="w-full"
            onClick={send}
            disabled={!input.trim() || busy}
          >
            Gửi
          </Button>
        </div>
      </div>

      {/* Preview pane */}
      <div
        className={cn(
          "min-w-0 flex-auto overflow-y-auto bg-muted/30 p-3 sm:p-4 md:block",
          mobileTab === "preview" ? "block" : "hidden"
        )}
      >
        {proposals.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Bản xem trước các đề xuất của AI sẽ hiện ở đây.
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-lg border border-border bg-background"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
                  <div className="w-full font-medium text-foreground sm:w-auto sm:flex-auto">
                    {p.title}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 sm:flex-none"
                    onClick={() => removeProposal(p.id)}
                  >
                    <Trash2Icon className="mr-1 size-4" /> Bỏ
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => accept(p)}
                  >
                    <CheckIcon className="mr-1 size-4" /> Chấp nhận
                  </Button>
                </div>
                <div className="p-3">
                  {p.kind === "message" ? (
                    <MessagePreview msg={p.messageData} />
                  ) : (
                    <div className="h-[320px] w-full">
                      <FlowReadOnly
                        nodes={p.flow!.nodes}
                        edges={p.flow!.edges}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
