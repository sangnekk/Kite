import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useAppStateGuildChannelsQuery,
  useAppStateGuildRolesQuery,
  useAppStateGuildsQuery,
} from "@/lib/api/queries";
import {
  ChannelType,
  fitsChannelTypes,
  groupChannels,
  matchesPickSearch,
  PickConfig,
  unresolvedLabel,
} from "@/lib/flow/inputMode";
import { useAppId } from "@/lib/hooks/params";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  FolderIcon,
  HashIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  RadioIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";

interface ListState<T> {
  items: T[];
  loading: boolean;
  error?: string;
  retry: () => void;
}

// What the list queries share: the items, and why there are none yet.
function listState<T>(query: {
  data?:
    | { success: true; data: (T | undefined)[] }
    | { success: false; error: { message: string } };
  isFetching: boolean;
  isError: boolean;
  refetch: () => unknown;
}): ListState<T> {
  const res = query.data;
  return {
    items: res?.success ? res.data.filter((i): i is T => !!i) : [],
    loading: query.isFetching && !res,
    error: query.isError
      ? "Không kết nối được tới máy chủ."
      : res && !res.success
        ? res.error.message
        : undefined,
    retry: () => void query.refetch(),
  };
}

const guildKey = (appId: string) => `kite.flow.guild.${appId}`;

function readStoredGuild(appId: string): string | null {
  try {
    return window.localStorage.getItem(guildKey(appId));
  } catch {
    return null;
  }
}

function storeGuild(appId: string, guildId: string) {
  try {
    window.localStorage.setItem(guildKey(appId), guildId);
  } catch {
    // private mode or blocked storage: the choice just is not remembered
  }
}

interface Row {
  id: string;
  name: string;
  prefix?: ReactNode;
}

interface Section {
  heading?: string;
  rows: Row[];
}

/** A searchable list in a popover; the building block of the three pickers. */
function PickCombobox({
  value,
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  sections,
  state,
  onSelect,
  onClear,
}: {
  value: string;
  label: ReactNode;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  sections: Section[];
  state: Pick<ListState<unknown>, "loading" | "error" | "retry">;
  onSelect: (id: string) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          rows: s.rows.filter((r) => matchesPickSearch(r, search)),
        }))
        .filter((s) => s.rows.length > 0),
    [sections, search],
  );

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      {/* On a phone the editor is a drawer. modal keeps the scroll of the list
          working inside it (the drawer locks the scroll outside itself) and
          data-vaul-no-drag keeps a swipe on the list from dragging the drawer. */}
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 min-w-0 flex-1 justify-between overflow-hidden px-3 font-normal"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                !value && "text-muted-foreground",
              )}
            >
              {value ? label : placeholder}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          data-vaul-no-drag
          className="w-[min(20rem,calc(100vw-2rem))] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[min(300px,50dvh)] touch-pan-y overscroll-contain">
              {state.loading ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Đang tải...
                </div>
              ) : state.error ? (
                <div className="space-y-2 px-3 py-6 text-center text-sm">
                  <div className="text-destructive">{state.error}</div>
                  <Button variant="outline" size="sm" onClick={state.retry}>
                    Thử lại
                  </Button>
                </div>
              ) : visible.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                visible.map((section, i) => (
                  <CommandGroup
                    key={section.heading ?? i}
                    heading={section.heading}
                  >
                    {section.rows.map((row) => (
                      <CommandItem
                        key={row.id}
                        value={row.id}
                        onSelect={() => {
                          onSelect(row.id);
                          setOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === row.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {row.prefix}
                        <span className="truncate">{row.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Bỏ chọn"
          onClick={onClear}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function channelIcon(type: number) {
  const cls = "mr-1.5 h-4 w-4 shrink-0 text-muted-foreground";
  switch (type) {
    case ChannelType.Voice:
      return <Volume2Icon className={cls} />;
    case ChannelType.Category:
      return <FolderIcon className={cls} />;
    case ChannelType.Announcement:
      return <MegaphoneIcon className={cls} />;
    case ChannelType.AnnouncementThread:
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
      return <MessageSquareIcon className={cls} />;
    case ChannelType.Stage:
      return <RadioIcon className={cls} />;
    case ChannelType.Forum:
    case ChannelType.Media:
      return <MessagesSquareIcon className={cls} />;
    default:
      return <HashIcon className={cls} />;
  }
}

function roleDot(color: number) {
  const hex =
    color > 0
      ? `#${(color & 0xffffff).toString(16).padStart(6, "0")}`
      : "#99aab5";
  return (
    <span
      className="mr-2 h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: hex }}
    />
  );
}

/**
 * Picks a server, a channel or a role of the app by name and gives back its ID.
 * The channels and roles belong to a server, so a server is chosen first (and
 * skipped when the bot is in only one).
 */
export default function EntityPicker({
  config,
  value,
  onChange,
}: {
  config: PickConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const appId = useAppId();
  const guilds = listState(useAppStateGuildsQuery(appId));

  const [chosenGuild, setChosenGuild] = useState<string | null>(null);

  // Remember the server per app, the next flow starts on the same one.
  useEffect(() => {
    if (appId) setChosenGuild(readStoredGuild(appId));
  }, [appId]);

  const guildId = useMemo(() => {
    if (guilds.items.length === 0) return null;
    if (chosenGuild && guilds.items.some((g) => g.id === chosenGuild)) {
      return chosenGuild;
    }
    return guilds.items[0].id;
  }, [guilds.items, chosenGuild]);

  const chooseGuild = (id: string) => {
    setChosenGuild(id);
    if (appId) storeGuild(appId, id);
  };

  const guildRows: Row[] = guilds.items.map((g) => ({
    id: g.id,
    name: g.name,
  }));
  const guildPicker = (
    <PickCombobox
      value={guildId ?? ""}
      label={guilds.items.find((g) => g.id === guildId)?.name ?? ""}
      placeholder="Chọn server..."
      searchPlaceholder="Tìm server..."
      emptyText="Bot chưa ở trong server nào."
      sections={[{ rows: guildRows }]}
      state={guilds}
      onSelect={chooseGuild}
    />
  );

  if (config.kind === "guild") {
    return (
      <div className="w-0 min-w-full">
        <PickCombobox
          value={value}
          label={
            guilds.items.find((g) => g.id === value)?.name ??
            unresolvedLabel(value)
          }
          placeholder="Chọn server..."
          searchPlaceholder="Tìm server..."
          emptyText="Bot chưa ở trong server nào."
          sections={[{ rows: guildRows }]}
          state={guilds}
          onSelect={onChange}
          onClear={() => onChange("")}
        />
      </div>
    );
  }

  // w-0 min-w-full: fill the width of the panel but do not ask for more, a long
  // name is cut by the box instead of pushing the panel wider.
  return (
    <div className="w-0 min-w-full space-y-2">
      {guilds.items.length > 1 && guildPicker}
      {config.kind === "channel" ? (
        <ChannelCombobox
          config={config}
          guildId={guildId}
          guildsReady={!guilds.loading && !guilds.error}
          value={value}
          onChange={onChange}
        />
      ) : (
        <RoleCombobox
          guildId={guildId}
          guildsReady={!guilds.loading && !guilds.error}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ChannelCombobox({
  config,
  guildId,
  guildsReady,
  value,
  onChange,
}: {
  config: PickConfig;
  guildId: string | null;
  guildsReady: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const appId = useAppId();
  const channels = listState(useAppStateGuildChannelsQuery(appId, guildId));

  const sections = useMemo<Section[]>(
    () =>
      groupChannels(channels.items, config.channelTypes).map((g) => ({
        heading: g.label,
        rows: g.channels.map((c) => ({
          id: c.id,
          name: c.name,
          prefix: channelIcon(c.type),
        })),
      })),
    [channels.items, config.channelTypes],
  );

  const found = channels.items.find((c) => c.id === value);

  // A channel saved before the list was limited (a category in a field that sends
  // a message) stays visible, but is called out instead of looking fine.
  const label = found
    ? `${found.type === ChannelType.Category ? "" : "#"}${found.name}${
        fitsChannelTypes(found.type, config.channelTypes)
          ? ""
          : " (loại kênh không phù hợp)"
      }`
    : unresolvedLabel(value);

  return (
    <PickCombobox
      value={value}
      label={label}
      placeholder="Chọn kênh..."
      searchPlaceholder="Tìm kênh..."
      emptyText={
        guildsReady && !guildId
          ? "Bot chưa ở trong server nào."
          : "Không có kênh nào. Bot cần đang chạy và ở trong server này."
      }
      sections={sections}
      state={channels}
      onSelect={onChange}
      onClear={() => onChange("")}
    />
  );
}

function RoleCombobox({
  guildId,
  guildsReady,
  value,
  onChange,
}: {
  guildId: string | null;
  guildsReady: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const appId = useAppId();
  const roles = listState(useAppStateGuildRolesQuery(appId, guildId));

  const sections = useMemo<Section[]>(
    () => [
      {
        rows: roles.items
          // @everyone has the ID of the server, managed roles can not be given
          .filter((r) => r.id !== guildId && !r.managed)
          .map((r) => ({ id: r.id, name: r.name, prefix: roleDot(r.color) })),
      },
    ],
    [roles.items, guildId],
  );

  const found = roles.items.find((r) => r.id === value);

  return (
    <PickCombobox
      value={value}
      label={found ? found.name : unresolvedLabel(value)}
      placeholder="Chọn vai trò..."
      searchPlaceholder="Tìm vai trò..."
      emptyText={
        guildsReady && !guildId
          ? "Bot chưa ở trong server nào."
          : "Không có vai trò nào. Bot cần đang chạy và ở trong server này."
      }
      sections={sections}
      state={roles}
      onSelect={onChange}
      onClear={() => onChange("")}
    />
  );
}
