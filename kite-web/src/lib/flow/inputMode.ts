import { normalizeSearch } from "@/lib/appList";
import type { Channel } from "@/lib/types/wire.gen";

/**
 * How a flow field that holds a Discord ID is edited: picked from a list by
 * name, or typed as an ID or an expression like {{channel.id}}. The stored value
 * is the same string in both cases, so nothing about a saved flow changes.
 */
export type InputMode = "pick" | "expression";

export type PickKind = "channel" | "role" | "guild";

const SNOWFLAKE = /^\d{15,25}$/;

export function isSnowflake(value: string | undefined | null): boolean {
  return SNOWFLAKE.test((value ?? "").trim());
}

/** An empty field or a plain ID is picked; anything else is an expression. */
export function detectInputMode(value: string | undefined | null): InputMode {
  const v = (value ?? "").trim();
  return v === "" || SNOWFLAKE.test(v) ? "pick" : "expression";
}

// Discord channel types the pickers care about.
export const ChannelType = {
  Text: 0,
  Voice: 2,
  Category: 4,
  Announcement: 5,
  AnnouncementThread: 10,
  PublicThread: 11,
  PrivateThread: 12,
  Stage: 13,
  Forum: 15,
  Media: 16,
} as const;

const THREAD_TYPES: number[] = [
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
];

export function isThread(type: number): boolean {
  return THREAD_TYPES.includes(type);
}

/** Channels a message can be sent to. */
export const WRITABLE_CHANNEL_TYPES: number[] = [
  ChannelType.Text,
  ChannelType.Voice,
  ChannelType.Announcement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.Stage,
];

export interface PickConfig {
  kind: PickKind;
  /** The channel types the list shows, every type when left out. */
  channelTypes?: number[];
}

/**
 * Which fields of a node take an ID that can be picked. One place, so a new
 * field only needs a line here.
 */
export const PICK_FIELDS: Record<string, PickConfig> = {
  channel_target: { kind: "channel" },
  transcript_output_channel: {
    kind: "channel",
    channelTypes: WRITABLE_CHANNEL_TYPES,
  },
  role_target: { kind: "role" },
  guild_target: { kind: "guild" },
};

export function pickConfigOf(field: string): PickConfig | undefined {
  return PICK_FIELDS[field];
}

/**
 * What an empty field shows when its input has no hint of its own. An empty
 * box does not say whether it wants an ID, a number or a variable.
 */
export const FIELD_HINTS: Record<string, string> = {
  user_target: "ID người dùng, hoặc biến như {{user.id}}",
  message_target: "ID tin nhắn, hoặc biến",
  transcript_before: "ID tin nhắn, ví dụ 123456789012345678",
  transcript_after: "ID tin nhắn, ví dụ 123456789012345678",
  transcript_limit: "100",
  transcript_name: "Ví dụ: Ticket {{user.username}}",
  message_purge_count: "Từ 1 đến 100",
  channel_slowmode_seconds: "Số giây, 0 để tắt",
  sleep_duration_seconds: "Số giây, ví dụ 5",
};

export function fieldHint(field: string): string | undefined {
  return FIELD_HINTS[field];
}

export interface ChannelGroup {
  /** The category, or one of the fixed groups below. */
  id: string;
  label: string;
  channels: Channel[];
}

export const NO_CATEGORY_GROUP = "none";
export const THREADS_GROUP = "threads";

function byPosition(a: Channel, b: Channel): number {
  return a.position - b.position || a.name.localeCompare(b.name);
}

/**
 * Groups the channels of a guild the way Discord shows them: the channels
 * without a category first, then every category in its order, then the threads.
 * Categories are only listed as channels when the field accepts them.
 */
export function groupChannels(
  channels: (Channel | undefined)[],
  allowedTypes?: number[]
): ChannelGroup[] {
  const all = channels.filter((c): c is Channel => !!c);
  const categories = all
    .filter((c) => c.type === ChannelType.Category)
    .sort(byPosition);
  const categoryIds = new Set(categories.map((c) => c.id));

  const allowed = (c: Channel) => !allowedTypes || allowedTypes.includes(c.type);

  const none: Channel[] = [];
  const threads: Channel[] = [];
  const inCategory = new Map<string, Channel[]>();

  for (const c of all) {
    if (c.type === ChannelType.Category) continue;
    if (!allowed(c)) continue;

    if (isThread(c.type)) {
      threads.push(c);
    } else if (c.parent_id && categoryIds.has(c.parent_id)) {
      const list = inCategory.get(c.parent_id) ?? [];
      list.push(c);
      inCategory.set(c.parent_id, list);
    } else {
      none.push(c);
    }
  }

  const groups: ChannelGroup[] = [];

  if (none.length > 0) {
    groups.push({
      id: NO_CATEGORY_GROUP,
      label: "Không có danh mục",
      channels: none.sort(byPosition),
    });
  }

  // Every type is accepted when the field names none, categories included.
  const categoryPickable =
    !allowedTypes || allowedTypes.includes(ChannelType.Category);

  for (const category of categories) {
    groups.push({
      id: category.id,
      label: category.name,
      channels: [
        ...(categoryPickable ? [category] : []),
        ...(inCategory.get(category.id) ?? []).sort(byPosition),
      ],
    });
  }

  if (threads.length > 0) {
    groups.push({
      id: THREADS_GROUP,
      label: "Thread",
      channels: threads.sort(byPosition),
    });
  }

  return groups.filter((g) => g.channels.length > 0);
}

export interface PickItem {
  id: string;
  name: string;
}

/** Search that ignores case and accents, so "dang" finds "Đặng". */
export function matchesPickSearch(item: PickItem, query: string): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return (
    normalizeSearch(item.name).includes(needle) || item.id.includes(needle)
  );
}

/** The text shown for a stored value that can not be found in the list. */
export function unresolvedLabel(value: string): string {
  const v = value.trim();
  if (isSnowflake(v)) return `${v} (không có trong danh sách)`;
  return v;
}
