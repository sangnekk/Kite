import { useCurrentWebhookStore } from "../state/webhook";
import BaseInput from "@/tools/common/components/BaseInput";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShallow } from "zustand/react/shallow";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";
import { useCurrentMessageStore } from "../state/message";

export default function WebhookExecuteDialog() {
  const {
    webhookUrl,
    setWebhookUrl,
    threadId,
    setThreadId,
    messageId,
    setMessageId,
  } = useCurrentWebhookStore(useShallow((state) => state));

  async function sendMessage(edit: boolean) {
    if (!webhookUrl) return;

    try {
      let method = "POST";
      let url = new URL(webhookUrl);
      url.search = "?wait=true";

      if (edit) {
        url.pathname += `/messages/${messageId}`;
        method = "PATCH";
      }

      if (threadId) {
        url.search += `&thread_id=${threadId}`;
      }

      const resp = await fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(useCurrentMessageStore.getState()),
      });

      if (resp.status >= 300) {
        toast.error(
          `Gửi tin nhắn thất bại (${resp.status}): ${resp.statusText}`
        );
        return;
      }

      const data = await resp.json();
      setMessageId(data.id);

      if (edit) {
        toast.success("Đã cập nhật tin nhắn thành công");
      } else {
        toast.success("Đã gửi tin nhắn thành công");
      }
    } catch (e) {
      toast.error(`Gửi tin nhắn thất bại: ${e}`);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Gửi tin nhắn</DialogTitle>
        <DialogDescription>
          Gửi tin nhắn của bạn đến webhook Discord hoặc Guilded.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 my-3">
        <BaseInput
          type="url"
          label="URL Webhook"
          value={webhookUrl || ""}
          onChange={(v) => setWebhookUrl(v || undefined)}
        />
        <div className="flex space-x-3">
          <BaseInput
            type="text"
            label="ID luồng"
            value={threadId || ""}
            onChange={(v) => setThreadId(v || undefined)}
          />
          <BaseInput
            type="text"
            label="ID tin nhắn"
            value={messageId || ""}
            onChange={(v) => setMessageId(v || undefined)}
          />
        </div>
      </div>
      <DialogFooter>
        {messageId && (
          <Button
            variant="secondary"
            onClick={() => sendMessage(true)}
            disabled={!webhookUrl}
          >
            Sửa tin nhắn
          </Button>
        )}
        <Button
          onClick={() => sendMessage(false)}
          className="flex items-center space-x-2"
          disabled={!webhookUrl}
        >
          <SendIcon className="w-5 h-5" />
          <div>Gửi tin nhắn</div>
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
