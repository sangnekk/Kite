import { useAIConversations } from "@/lib/ai/useAIConversations";
import { useAICreditsQuery } from "@/lib/api/queries";
import { NodeData } from "@/lib/flow/dataSchema";
import { getLayoutedElements } from "@/lib/flow/layout";
import { useAIModels } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { Edge, Node, useReactFlow } from "@xyflow/react";
import { SparklesIcon, SquarePenIcon, XIcon } from "lucide-react";
import { useRouter } from "next/router";
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
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

interface Props {
  context: string;
  onApplied: () => void;
  onClose: () => void;
}

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:3001";

export default function FlowCopilotPanel({
  context,
  onApplied,
  onClose,
}: Props) {
  const appId = useAppId();
  const router = useRouter();
  // Conversations are scoped per editor route (this flow entity); each route has
  // its own list of saved chats the user can pick from.
  const contextKey = router.asPath.split(/[?#]/)[0];
  const models = useAIModels();
  const creditsQuery = useAICreditsQuery(appId);
  const credits = creditsQuery.data?.success ? creditsQuery.data.data : undefined;

  const { getNodes, getEdges, setNodes, setEdges, fitView } =
    useReactFlow<Node<NodeData>>();

  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>("");

  // Apply an AI-produced flow to the canvas: reuse the editor's fixed entry
  // (remap the AI entry onto it to avoid a duplicate), then dagre-layout.
  const applyFlow = useCallback(
    (flowData: { nodes?: unknown[]; edges?: unknown[] }) => {
      let nodes = (flowData?.nodes ?? []) as Node<NodeData>[];
      let edges = (flowData?.edges ?? []) as Edge[];

      // Guard against clobbering the canvas: applyFlow REPLACES all nodes, so an
      // empty or entry-less flow would wipe the editor's trigger node. Throwing
      // here surfaces an error tool-result the agent can see and correct, instead
      // of silently destroying the user's flow.
      if (nodes.length === 0) {
        throw new Error("flow rỗng — không có gì để áp dụng");
      }
      const existingEntry = getNodes().find((n) => n.type?.startsWith("entry_"));
      const aiEntry = nodes.find((n) => n.type?.startsWith("entry_"));
      if (!aiEntry) {
        throw new Error(
          "flow không có node entry_*; giữ entry hiện tại và gửi lại flow đầy đủ (kèm node entry)"
        );
      }
      if (existingEntry && aiEntry && aiEntry.id !== existingEntry.id) {
        const remap = (id: string) =>
          id === aiEntry.id ? existingEntry.id : id;
        edges = edges.map((e) => ({
          ...e,
          source: remap(e.source),
          target: remap(e.target),
        }));
        nodes = nodes.map((n) =>
          n.id === aiEntry.id
            ? { ...existingEntry, data: { ...existingEntry.data, ...n.data } }
            : n
        );
      }

      const layouted = getLayoutedElements(
        nodes as unknown as Node[],
        edges as unknown as Edge[],
        { direction: "TB" }
      );
      setNodes(layouted.nodes as Node<NodeData>[]);
      setEdges(layouted.edges);
      onApplied();
      setTimeout(() => fitView({ duration: 300 }), 50);
    },
    [getNodes, setNodes, setEdges, fitView, onApplied]
  );

  const { messages, setMessages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${AI_SERVICE_URL}/chat`,
      credentials: "include",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === "update_flow") {
        try {
          applyFlow((toolCall.input as { flow: any }).flow);
          addToolResult({
            tool: "update_flow",
            toolCallId: toolCall.toolCallId,
            output: { ok: true },
          });
        } catch (e) {
          addToolResult({
            tool: "update_flow",
            toolCallId: toolCall.toolCallId,
            output: { ok: false, error: String(e) },
          });
        }
      }
    },
    onError: (e) => toast.error(`Trợ lý lỗi: ${e.message}`),
    onFinish: () => creditsQuery.refetch(),
  });

  const busy = status === "submitted" || status === "streaming";

  const {
    conversations,
    conversationId,
    newChat,
    selectConversation,
    deleteConversation,
  } = useAIConversations({
    appId,
    context: contextKey,
    messages,
    setMessages,
    status,
    autoContinue: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage(
      { text },
      {
        body: {
          appId,
          context,
          model: model || undefined,
          flow: { nodes: getNodes(), edges: getEdges() },
        },
      }
    );
  }, [input, busy, sendMessage, appId, context, model, getNodes, getEdges]);

  return (
    <div className="w-96 flex-none border-l border-border bg-background flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-none">
        <SparklesIcon className="size-5 text-primary" />
        <div className="flex-auto">
          <div className="flex items-center gap-2 leading-tight">
            <span className="font-bold text-foreground">Trợ lý AI</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              Beta
            </Badge>
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
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-5" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-auto overflow-y-auto">
        <div className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Mô tả điều bạn muốn bot làm, ví dụ: &quot;chào mừng thành viên mới
              ở kênh #welcome&quot; hoặc &quot;tạo lệnh /ban chỉ admin
              dùng&quot;. Trợ lý sẽ dựng flow trực tiếp trên canvas.
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return m.role === "user" ? (
                    <div
                      key={i}
                      className="ml-6 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
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
                          <ToolOutput
                            output={tp.output}
                            errorText={tp.errorText}
                          />
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

      <div className="flex-none border-t border-border p-3 space-y-2">
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
          className="resize-none min-h-[60px]"
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
  );
}
