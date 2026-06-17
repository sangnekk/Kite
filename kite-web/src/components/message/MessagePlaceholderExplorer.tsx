import { useMemo, useState } from "react";
import PlaceholderExplorer from "../common/PlaceholderExplorer";
import { PlaceholderSuggestion } from "../common/PlaceholderInput";
import { VariableIcon } from "lucide-react";

// useMessagePlaceholderSuggestions returns a flat list for the inline "{{"
// autocomplete in message fields (covers both interaction and event contexts).
export function useMessagePlaceholderSuggestions(): PlaceholderSuggestion[] {
  const interaction = useGlobalPlaceholders("interaction");
  const event = useGlobalPlaceholders("event");

  return useMemo(() => {
    const seen = new Set<string>();
    const out: PlaceholderSuggestion[] = [];
    for (const group of [...interaction, ...event]) {
      for (const p of group.placeholders) {
        if (seen.has(p.value)) continue;
        seen.add(p.value);
        out.push({ label: p.label, value: p.value, group: group.label });
      }
    }
    return out;
  }, [interaction, event]);
}

export default function MessagePlaceholderExplorer({
  onSelect,
}: {
  onSelect: (value: string) => void;
}) {
  const [context, setContext] = useState<"interaction" | "event">(
    "interaction"
  );

  const globalPlaceholders = useGlobalPlaceholders(context);

  const placeholders = useMemo(
    () => [...globalPlaceholders],
    [globalPlaceholders]
  );

  return (
    <div className="absolute top-10 right-1.5 z-20">
      <PlaceholderExplorer
        onSelect={onSelect}
        placeholders={placeholders}
        tab={context}
        tabs={[
          {
            label: "Interaction",
            value: "interaction",
          },
          {
            label: "Event",
            value: "event",
          },
        ]}
        onTabChange={(tab) => {
          setContext(tab as "interaction" | "event");
        }}
      >
        <VariableIcon
          className="h-5.5 w-5.5 text-muted-foreground hover:text-foreground cursor-pointer"
          role="button"
        />
      </PlaceholderExplorer>
    </div>
  );
}

function useGlobalPlaceholders(context: "interaction" | "event") {
  return useMemo(() => {
    const res = [
      {
        label: "User",
        placeholders: [
          {
            label: "User",
            value: `user`,
          },
          {
            label: "User ID",
            value: `user.id`,
          },
          {
            label: "User Mention",
            value: `user.mention`,
          },
          {
            label: "User Username",
            value: `user.username`,
          },
          {
            label: "User Discriminator",
            value: `user.discriminator`,
          },
          {
            label: "User Display Name",
            value: `user.display_name`,
          },
          {
            label: "User Avatar URL",
            value: `user.avatar_url`,
          },
          {
            label: "User Banner URL",
            value: `user.banner_url`,
          },
        ],
      },
      {
        label: "Server",
        placeholders: [
          {
            label: "Server ID",
            value: `guild.id`,
          },
        ],
      },
      {
        label: "Channel",
        placeholders: [
          {
            label: "Channel ID",
            value: `channel.id`,
          },
        ],
      },
    ];

    if (context === "event") {
      res.push({
        label: "Message",
        placeholders: [
          { label: "Message ID", value: `message.id` },
          { label: "Message Content", value: `message.content` },
        ],
      });
    }
    return res;
  }, [context]);
}
