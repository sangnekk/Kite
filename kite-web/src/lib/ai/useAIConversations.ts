import { apiRequest } from "@/lib/api/client";
import {
  useAIConversationQuery,
  useAIConversationsQuery,
} from "@/lib/api/queries";
import type { AIConversationSummary } from "@/lib/types/wire.gen";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { deriveConversationTitle, genConversationId } from "./conversation";

const present = (c: AIConversationSummary | undefined): c is AIConversationSummary =>
  Boolean(c);

interface Options {
  appId: string;
  // Stable bucket the conversations are grouped under (e.g. "studio" or the
  // flow editor route).
  context: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  // useChat status; persistence happens once a turn settles ("ready").
  status: string;
  // When true, opening auto-continues the most recent saved conversation
  // (the in-editor copilot); the AI Studio starts fresh instead.
  autoContinue?: boolean;
  // Called whenever the shown conversation is replaced (load/switch/new), so the
  // caller can clear view-only state such as staged proposals.
  onReset?: () => void;
}

// useAIConversations encapsulates the multi-conversation copilot history: listing
// saved chats, loading the selected one's messages, persisting after each turn,
// and switching/deleting — shared by the flow copilot and the AI Studio.
export function useAIConversations({
  appId,
  context,
  messages,
  setMessages,
  status,
  autoContinue = false,
  onReset,
}: Options) {
  const queryClient = useQueryClient();

  const conversationsQuery = useAIConversationsQuery(appId, context);
  const conversations = conversationsQuery.data?.success
    ? conversationsQuery.data.data.filter(present)
    : [];

  const [conversationId, setConversationId] = useState("");
  const conversationQuery = useAIConversationQuery(appId, conversationId);

  // Tracks which conversation id's messages are currently shown, so we don't
  // re-load or re-save the same snapshot (or save one chat under another's id).
  const appliedIdRef = useRef<string | null>(null);
  const savedSigRef = useRef("");
  const autoSelectedRef = useRef(false);

  const invalidateList = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ["apps", appId, "ai", "conversations", context],
      }),
    [queryClient, appId, context]
  );

  // Auto-continue the most recent conversation when the panel opens (opt-in).
  useEffect(() => {
    if (!autoContinue) return;
    if (autoSelectedRef.current || !conversationsQuery.data) return;
    autoSelectedRef.current = true;
    const list = conversationsQuery.data.success
      ? conversationsQuery.data.data.filter(Boolean)
      : [];
    if (list.length > 0) {
      appliedIdRef.current = null;
      setConversationId(list[0]!.id);
    }
  }, [autoContinue, conversationsQuery.data]);

  // Load messages of the selected conversation when it (or its data) changes.
  useEffect(() => {
    if (!conversationId) return;
    if (appliedIdRef.current === conversationId) return;
    const res = conversationQuery.data;
    if (res && res.success) {
      appliedIdRef.current = conversationId;
      const loaded = (res.data.messages ?? []) as unknown as UIMessage[];
      setMessages(loaded);
      onReset?.();
      // Mark as already-persisted so the save effect doesn't immediately re-save.
      savedSigRef.current = `${conversationId}:${loaded.length}`;
    }
    // onReset is intentionally excluded; it's a stable reset callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversationQuery.data, setMessages]);

  // Persist after each completed turn (creating the conversation on first turn).
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    let id = conversationId;
    if (!id) {
      id = genConversationId();
      setConversationId(id);
      appliedIdRef.current = id; // we own this conversation; don't reload it
    } else if (appliedIdRef.current !== id) {
      // Mid-switch: the shown messages belong to the previous chat — don't save
      // them under the newly selected id (that would overwrite it).
      return;
    }
    const sig = `${id}:${messages.length}`;
    if (savedSigRef.current === sig) return;
    savedSigRef.current = sig;
    apiRequest(`/v1/apps/${appId}/ai/conversations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        title: deriveConversationTitle(messages),
        messages,
      }),
    })
      .then(invalidateList)
      .catch(() => {});
  }, [status, messages, conversationId, appId, context, invalidateList]);

  const newChat = useCallback(() => {
    setMessages([]);
    onReset?.();
    setConversationId("");
    appliedIdRef.current = null;
    savedSigRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMessages]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === conversationId) return;
      // Clear the current view so we never persist the previous chat's messages
      // under the newly selected id; the load effect fills it once data arrives.
      appliedIdRef.current = null;
      savedSigRef.current = "";
      setMessages([]);
      onReset?.();
      setConversationId(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, setMessages]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      apiRequest(`/v1/apps/${appId}/ai/conversations/${id}`, {
        method: "DELETE",
      })
        .then(invalidateList)
        .catch(() => {});
      if (id === conversationId) newChat();
    },
    [appId, conversationId, invalidateList, newChat]
  );

  return {
    conversations,
    conversationId,
    newChat,
    selectConversation,
    deleteConversation,
  };
}
