import { useMemo } from "react";
import { useAssetQuery } from "@/lib/api/queries";
import { useAppId } from "@/lib/hooks/params";
import { useResponseData } from "@/lib/hooks/api";
import { colorIntToHex } from "@/tools/common/utils/color";
import { cn } from "@/lib/utils";
import MessageMarkdown from "./MessageMarkdown";
import type {
  MessageComponent,
  MessageComponentMediaItem,
} from "@/lib/message/schema";

// A lightweight, Discord-like renderer for Components V2. The @skyra discord
// components library does not (yet) ship V2 layout components, so we render an
// approximation ourselves.

const buttonColors: Record<number, string> = {
  1: "#5865F2",
  2: "#4E5058",
  3: "#248046",
  4: "#da373c",
  5: "#4E5058",
};

export default function MessageV2Components({
  components,
}: {
  components: MessageComponent[];
}) {
  return (
    <div className="space-y-2 text-[#dbdee1] text-sm">
      {components.map((c) => (
        <V2Component key={(c as any).id} component={c} />
      ))}
    </div>
  );
}

function V2Component({ component }: { component: any }) {
  switch (component.type) {
    case 17: // Container
      return (
        <div
          className="rounded-md border-l-4 bg-[#2b2d31] border border-[#1e1f22] overflow-hidden"
          style={{
            borderLeftColor: component.accent_color
              ? colorIntToHex(component.accent_color)
              : "#4E5058",
          }}
        >
          <div className={cn("p-3 space-y-2", component.spoiler && "blur-[2px]")}>
            {(component.components ?? []).map((c: any) => (
              <V2Component key={c.id} component={c} />
            ))}
          </div>
        </div>
      );
    case 10: // Text Display
      return <MessageMarkdown>{component.content || ""}</MessageMarkdown>;
    case 14: // Separator
      return (
        <div className={component.spacing === 2 ? "py-3" : "py-1.5"}>
          {component.divider !== false && (
            <div className="h-px w-full bg-[#3f4147]" />
          )}
        </div>
      );
    case 9: // Section
      return (
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            {(component.components ?? []).map((c: any) => (
              <V2Component key={c.id} component={c} />
            ))}
          </div>
          <div className="flex-none">
            <V2Accessory accessory={component.accessory} />
          </div>
        </div>
      );
    case 11: // Thumbnail
      return (
        <MediaImage
          media={component.media}
          className={cn(
            "rounded-md max-h-20 max-w-20 object-cover",
            component.spoiler && "blur-md"
          )}
        />
      );
    case 12: // Media Gallery
      return (
        <div className="grid grid-cols-3 gap-1">
          {(component.items ?? []).map((item: any, i: number) => (
            <MediaImage
              key={i}
              media={item.media}
              className={cn(
                "rounded-md w-full h-24 object-cover",
                item.spoiler && "blur-md"
              )}
            />
          ))}
        </div>
      );
    case 13: // File
      return <FilePreview media={component.media} spoiler={component.spoiler} />;
    case 1: // Action Row (buttons)
      return (
        <div className="flex flex-wrap gap-2">
          {(component.components ?? []).map((c: any) =>
            c.type === 2 ? <V2Button key={c.id} button={c} /> : null
          )}
        </div>
      );
    default:
      return null;
  }
}

function V2Accessory({ accessory }: { accessory: any }) {
  if (!accessory) return null;
  if (accessory.type === 11) {
    return (
      <MediaImage
        media={accessory.media}
        className={cn(
          "rounded-md max-h-20 max-w-20 object-cover",
          accessory.spoiler && "blur-md"
        )}
      />
    );
  }
  if (accessory.type === 2) {
    return <V2Button button={accessory} />;
  }
  return null;
}

function V2Button({ button }: { button: any }) {
  return (
    <button
      type="button"
      disabled={button.disabled}
      className={cn(
        "px-3 py-1.5 rounded text-white text-sm font-medium whitespace-nowrap",
        button.disabled && "opacity-50 cursor-not-allowed"
      )}
      style={{ backgroundColor: buttonColors[button.style] ?? buttonColors[2] }}
    >
      {button.emoji?.name ? `${button.emoji.name} ` : ""}
      {button.label || (button.style === 5 ? "Link" : "Button")}
    </button>
  );
}

function MediaImage({
  media,
  className,
}: {
  media: MessageComponentMediaItem | undefined;
  className?: string;
}) {
  const url = useMediaUrl(media);
  if (!url) {
    return (
      <div
        className={cn(
          "bg-[#1e1f22] flex items-center justify-center text-xs text-[#949ba4]",
          className
        )}
      >
        no image
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}

function FilePreview({
  media,
  spoiler,
}: {
  media: MessageComponentMediaItem | undefined;
  spoiler?: boolean;
}) {
  const url = useMediaUrl(media);
  const name = useMemo(() => {
    if (!url) return "file";
    try {
      return decodeURIComponent(url.split("/").pop() || "file");
    } catch {
      return "file";
    }
  }, [url]);

  return (
    <div
      className={cn(
        "rounded-md border border-[#3f4147] bg-[#2b2d31] px-3 py-2 text-sm text-[#00a8fc]",
        spoiler && "blur-[2px]"
      )}
    >
      📎 {name}
    </div>
  );
}

// useMediaUrl resolves a media item to a displayable URL. External URLs are used
// directly; uploaded assets are resolved through the asset query.
function useMediaUrl(media: MessageComponentMediaItem | undefined): string | null {
  const appId = useAppId();
  const asset = useResponseData(useAssetQuery(appId, media?.asset_id || ""));

  if (!media) return null;
  if (media.url) return media.url;
  if (media.asset_id && asset) return asset.url;
  return null;
}
