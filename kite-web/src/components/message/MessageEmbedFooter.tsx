import { useShallow } from "zustand/react/shallow";
import CollapsibleSection from "./MessageCollapsibleSection";
import { useCurrentMessage } from "@/lib/message/state";
import MessageInput from "./MessageInput";

export default function MessageEmbedFooter({
  embedId,
  embedIndex,
}: {
  embedId: number;
  embedIndex: number;
}) {
  const [text, setText] = useCurrentMessage(
    useShallow((state) => [
      state.embeds[embedIndex]?.footer?.text,
      state.setEmbedFooterText,
    ])
  );
  const [iconUrl, setIconUrl] = useCurrentMessage(
    useShallow((state) => [
      state.embeds[embedIndex]?.footer?.icon_url,
      state.setEmbedFooterIconUrl,
    ])
  );
  const [timestamp, setTimestamp] = useCurrentMessage(
    useShallow((state) => [
      state.embeds[embedIndex]?.timestamp,
      state.setEmbedTimestamp,
    ])
  );

  return (
    <CollapsibleSection
      title="Chân trang"
      size="md"
      valiationPathPrefix={`embeds.${embedIndex}.footer`}
      className="space-y-3"
    >
      <MessageInput
        type="text"
        label="Chân trang"
        maxLength={2048}
        value={text || ""}
        onChange={(v) => setText(embedIndex, v || undefined)}
        validationPath={`embeds.${embedIndex}.footer.text`}
        placeholders
      />
      <div className="flex space-x-3">
        <MessageInput
          type="url"
          label="URL biểu tượng chân trang"
          value={iconUrl || ""}
          onChange={(v) => setIconUrl(embedIndex, v || undefined)}
          validationPath={`embeds.${embedIndex}.footer.icon_url`}
          imageUpload
        />
        <MessageInput
          type="date"
          label="Dấu thời gian"
          value={timestamp}
          onChange={(v) => setTimestamp(embedIndex, v)}
          validationPath={`embeds.${embedIndex}.timestamp`}
        />
      </div>
    </CollapsibleSection>
  );
}
