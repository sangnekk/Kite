import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAssetCreateMutation } from "@/lib/api/mutations";
import { useAppId } from "@/lib/hooks/params";
import { LoaderIcon, UploadIcon } from "lucide-react";
import { MessageComponentMediaItem } from "@/lib/message/schema";
import { useAssetQuery } from "@/lib/api/queries";
import { useResponseData } from "@/lib/hooks/api";

// MediaInput edits a Components V2 media item. It supports either an external
// URL or an uploaded asset (which is referenced via attachment:// on the
// backend). For File components only uploads are allowed (uploadOnly).
export default function MediaInput({
  media,
  onChange,
  uploadOnly,
}: {
  media: MessageComponentMediaItem | undefined;
  onChange: (media: MessageComponentMediaItem) => void;
  uploadOnly?: boolean;
}) {
  const appId = useAppId();
  const createMutation = useAssetCreateMutation(appId);
  const [uploading, setUploading] = useState(false);

  const asset = useResponseData(useAssetQuery(appId, media?.asset_id || ""));

  const onUpload = useCallback(
    (file: File) => {
      setUploading(true);
      createMutation.mutate(file, {
        onSuccess(res) {
          if (res.success) {
            onChange({ asset_id: res.data.id });
          }
        },
        onSettled() {
          setUploading(false);
        },
      });
    },
    [createMutation, onChange]
  );

  return (
    <div className="space-y-2">
      {!uploadOnly && (
        <div className="space-y-1">
          <Label className="text-base">URL</Label>
          <Input
            value={media?.url || ""}
            placeholder="https://example.com/image.png"
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <label>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span>
              {uploading ? (
                <LoaderIcon className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <UploadIcon className="h-4 w-4 mr-1" />
              )}
              Upload
            </span>
          </Button>
        </label>
        {media?.asset_id && (
          <div className="text-sm text-muted-foreground truncate">
            Uploaded: {asset?.name || media.asset_id}
          </div>
        )}
      </div>
    </div>
  );
}
