import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { MessageComponentMediaItem } from "@/lib/message/schema";

// MediaInput edits a Components V2 media item by URL. (Asset upload is currently
// disabled in the message template editor.)
export default function MediaInput({
  media,
  onChange,
}: {
  media: MessageComponentMediaItem | undefined;
  onChange: (media: MessageComponentMediaItem) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-base">URL</Label>
      <Input
        value={media?.url || ""}
        placeholder="https://example.com/image.png"
        onChange={(e) => onChange({ url: e.target.value })}
      />
    </div>
  );
}
