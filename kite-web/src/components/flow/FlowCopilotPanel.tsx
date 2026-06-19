import { useFlowAssistMutation } from "@/lib/api/mutations";
import { NodeData } from "@/lib/flow/dataSchema";
import { getLayoutedElements } from "@/lib/flow/layout";
import { useAIModels } from "@/lib/hooks/api";
import { useAppId } from "@/lib/hooks/params";
import { FlowAssistMessage } from "@/lib/types/wire.gen";
import { Edge, Node, useReactFlow } from "@xyflow/react";
import { SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export default function FlowCopilotPanel({ onApplied, onClose }: Props) {
  const appId = useAppId();
  const models = useAIModels();
  const mutation = useFlowAssistMutation(appId);
  const { getNodes, getEdges, setNodes, setEdges, fitView } =
    useReactFlow<Node<NodeData>>();

  const [messages, setMessages] = useState<FlowAssistMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, mutation.isPending]);

  const send = useCallback(() => {
    const message = input.trim();
    if (!message || mutation.isPending) return;

    const history = messages;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");

    mutation.mutate(
      {
        message,
        flow: { nodes: getNodes(), edges: getEdges() } as any,
        history,
        model: model || undefined,
      },
      {
        onSuccess(res) {
          if (!res.success) {
            toast.error(`Trợ lý lỗi: ${res.error.message}`);
            setMessages((m) => [
              ...m,
              { role: "assistant", content: `⚠️ ${res.error.message}` },
            ]);
            return;
          }

          setMessages((m) => [
            ...m,
            { role: "assistant", content: res.data.message },
          ]);

          if (res.data.flow) {
            const layouted = getLayoutedElements(
              (res.data.flow.nodes ?? []) as unknown as Node[],
              (res.data.flow.edges ?? []) as unknown as Edge[],
              { direction: "TB" }
            );
            setNodes(layouted.nodes as Node<NodeData>[]);
            setEdges(layouted.edges);
            onApplied();
            setTimeout(() => fitView({ duration: 300 }), 50);
          }
        },
        onError(err) {
          toast.error(`Trợ lý lỗi: ${String(err)}`);
        },
      }
    );
  }, [
    input,
    messages,
    model,
    mutation,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    fitView,
    onApplied,
  ]);

  return (
    <div className="w-96 flex-none border-l border-border bg-background flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-none">
        <SparklesIcon className="size-5 text-primary" />
        <div className="font-bold text-foreground flex-auto">Trợ lý AI</div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XIcon className="size-5" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-auto overflow-y-auto">
        <div className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Mô tả điều bạn muốn bot làm, ví dụ: &quot;tạo lệnh /ban chỉ admin
              dùng được, ghi log vào kênh mod&quot;. Trợ lý sẽ dựng flow trực
              tiếp trên canvas.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-6 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
                  : "mr-6 rounded-lg bg-muted px-3 py-2 text-sm text-foreground whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
          ))}
          {mutation.isPending && (
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
                  {m!.name}
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
          disabled={!input.trim() || mutation.isPending}
        >
          Gửi
        </Button>
      </div>
    </div>
  );
}
