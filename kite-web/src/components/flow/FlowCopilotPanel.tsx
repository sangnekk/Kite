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
import { SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";
import Markdown from "../common/Markdown";
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
  onApplied: () => void;
  onClose: () => void;
}

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:3001";

export default function FlowCopilotPanel({ onApplied, onClose }: Props) {
  const appId = useAppId();
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

      const existingEntry = getNodes().find((n) => n.type?.startsWith("entry_"));
      const aiEntry = nodes.find((n) => n.type?.startsWith("entry_"));
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

  const { messages, sendMessage, addToolResult, status } = useChat({
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
          model: model || undefined,
          flow: { nodes: getNodes(), edges: getEdges() },
        },
      }
    );
  }, [input, busy, sendMessage, appId, model, getNodes, getEdges]);

  return (
    <div className="w-96 flex-none border-l border-border bg-background flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-none">
        <SparklesIcon className="size-5 text-primary" />
        <div className="flex-auto">
          <div className="font-bold text-foreground leading-tight">Trợ lý AI</div>
          {credits && (
            <div className="text-xs text-muted-foreground">
              Còn {credits.remaining}/{credits.limit_per_day} credit AI hôm nay
            </div>
          )}
        </div>
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
