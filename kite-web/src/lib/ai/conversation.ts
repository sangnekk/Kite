import type { UIMessage } from "ai";

// Client-generated id for a new AI conversation.
export function genConversationId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// First user message → conversation title (trimmed for the picker).
export function deriveConversationTitle(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts
    ?.filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join(" ")
    .trim();
  if (!text) return "Đoạn chat mới";
  return text.length > 60 ? text.slice(0, 60) + "…" : text;
}
