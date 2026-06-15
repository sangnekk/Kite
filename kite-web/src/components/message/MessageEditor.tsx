import MessageAttachmentSection from "./MessageAttachmentSection";
import MessageEmbedSection from "./MessageEmbedSection";
import MessageBody from "./MessageBody";
import MessageControls from "./MessageControls";
import MessageValidator from "./MessageValidator";
import MessageComponentsSection from "./MessageComponentsSection";
import { useCurrentMessage } from "@/lib/message/state";
import { MESSAGE_FLAG_COMPONENTS_V2 } from "@/lib/message/schema";

export default function MessageEditor({
  disableFlowEditor,
}: {
  disableFlowEditor?: boolean;
}) {
  // With Components V2 the content, embeds and attachments fields are not
  // allowed, so we hide those sections to avoid producing invalid messages.
  const isV2 = useCurrentMessage(
    (state) => ((state.flags ?? 0) & MESSAGE_FLAG_COMPONENTS_V2) !== 0
  );

  return (
    <div className="space-y-8">
      <MessageControls />
      <MessageBody />

      {!isV2 && <MessageAttachmentSection />}
      {!isV2 && <MessageEmbedSection />}
      <MessageComponentsSection disableFlowEditor={disableFlowEditor} />

      <MessageValidator />
    </div>
  );
}
