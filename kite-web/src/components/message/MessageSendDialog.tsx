import { ReactNode, useCallback, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import LoadingButton from "../common/LoadingButton";
import { Separator } from "../ui/separator";
import { useMessageInstances } from "@/lib/hooks/api";
import GuildSelect from "../common/GuildSelect";
import ChannelSelect from "../common/ChannelSelect";
import MessageSendInstanceEntry from "./MessageSendInstanceEntry";
import { useMessageInstanceCreateMutation } from "@/lib/api/mutations";
import { useAppId, useMessageId } from "@/lib/hooks/params";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";

export default function MessageSendDialog({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);

  const instances = useMessageInstances();
  const createMutation = useMessageInstanceCreateMutation(
    useAppId(),
    useMessageId()
  );

  const createInstance = useCallback(() => {
    if (createMutation.isPending || !guildId || !channelId) return;

    createMutation.mutate(
      {
        discord_guild_id: guildId,
        discord_channel_id: channelId,
      },
      {
        onSuccess(res) {
          if (res.success) {
            toast.success("Đã gửi tin nhắn!");
          } else {
            toast.error(
              `Gửi tin nhắn thất bại: ${res.error.message} (${res.error.code})`
            );
          }
        },
      }
    );
  }, [createMutation, channelId, guildId]);

  // We had to set modal={false} because otherwise the popovers don't work
  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gửi tin nhắn</DialogTitle>
          <DialogDescription>
            Gửi tin nhắn đến kênh đã chọn. Bot phải ở trong server và có
            quyền &quot;Manage Webhooks&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 overflow-x-hidden">
          <GuildSelect value={guildId} onChange={setGuildId} />
          <ChannelSelect
            guildId={guildId || null}
            value={channelId}
            onChange={setChannelId}
          />
          <LoadingButton
            onClick={createInstance}
            loading={createMutation.isPending}
          >
            Gửi
          </LoadingButton>
        </div>

        <Separator />
        <ScrollArea className="overflow-y-hidden max-h-64 pr-3">
          <div className="flex flex-col space-y-5">
            {instances?.map((instance) => (
              <MessageSendInstanceEntry
                key={instance!.id}
                instance={instance!}
              />
            ))}
            {instances?.length === 0 && (
              <div className="text-muted-foreground text-center text-sm font-light">
                Chưa có phiên bản nào của tin nhắn này.
              </div>
            )}
          </div>
        </ScrollArea>
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
