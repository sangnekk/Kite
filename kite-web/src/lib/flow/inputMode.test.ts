import { describe, expect, test } from "bun:test";
import type { Channel } from "@/lib/types/wire.gen";
import {
  ChannelType,
  channelTypesForNode,
  detectInputMode,
  fitsChannelTypes,
  groupChannels,
  isSnowflake,
  matchesPickSearch,
  pickConfigOf,
  unresolvedLabel,
  WRITABLE_CHANNEL_TYPES,
} from "./inputMode";

const ch = (
  id: string,
  name: string,
  type: number,
  extra: Partial<Channel> = {}
): Channel => ({ id, name, type, topic: "", position: 0, ...extra });

const ID = "123456789012345678";

describe("detectInputMode", () => {
  test("an empty field and a plain ID are picked", () => {
    expect(detectInputMode(undefined)).toBe("pick");
    expect(detectInputMode("")).toBe("pick");
    expect(detectInputMode("   ")).toBe("pick");
    expect(detectInputMode(ID)).toBe("pick");
    expect(detectInputMode(` ${ID} `)).toBe("pick");
  });

  test("an expression, or anything that is not an ID, is an expression", () => {
    expect(detectInputMode("{{channel.id}}")).toBe("expression");
    expect(detectInputMode("{{ result('a').channel_id }}")).toBe("expression");
    expect(detectInputMode("general")).toBe("expression");
    expect(detectInputMode("123")).toBe("expression");
  });

  test("isSnowflake", () => {
    expect(isSnowflake(ID)).toBe(true);
    expect(isSnowflake("12345")).toBe(false);
    expect(isSnowflake("{{x}}")).toBe(false);
    expect(isSnowflake(null)).toBe(false);
  });
});

describe("pickConfigOf", () => {
  test("knows the fields that take a channel, a role or a server", () => {
    expect(pickConfigOf("channel_target")?.kind).toBe("channel");
    expect(pickConfigOf("transcript_output_channel")?.kind).toBe("channel");
    expect(pickConfigOf("role_target")?.kind).toBe("role");
    expect(pickConfigOf("guild_target")?.kind).toBe("guild");
    expect(pickConfigOf("user_target")).toBeUndefined();
    expect(pickConfigOf("message_target")).toBeUndefined();
  });

  test("the output channel only offers channels a file can be sent to", () => {
    const types = pickConfigOf("transcript_output_channel")?.channelTypes;
    expect(types).toEqual(WRITABLE_CHANNEL_TYPES);
    expect(types).not.toContain(ChannelType.Category);
    expect(types).not.toContain(ChannelType.Forum);
  });
});

describe("groupChannels", () => {
  const channels = [
    ch("10", "rules", ChannelType.Text, { position: 0 }),
    ch("1", "Hỗ trợ", ChannelType.Category, { position: 2 }),
    ch("2", "Chung", ChannelType.Category, { position: 1 }),
    ch("11", "ticket", ChannelType.Text, { parent_id: "1", position: 1 }),
    ch("12", "faq", ChannelType.Text, { parent_id: "1", position: 0 }),
    ch("13", "chat", ChannelType.Text, { parent_id: "2", position: 0 }),
    ch("14", "voice", ChannelType.Voice, { parent_id: "2", position: 1 }),
    ch("15", "bug-123", ChannelType.PublicThread, { parent_id: "11" }),
    ch("16", "ideas", ChannelType.Forum, { parent_id: "2", position: 2 }),
  ];

  test("channels without a category first, then categories in order, then threads", () => {
    const groups = groupChannels(channels);
    expect(groups.map((g) => g.label)).toEqual([
      "Không có danh mục",
      "Chung",
      "Hỗ trợ",
      "Thread",
    ]);
  });

  test("channels follow their position inside a group", () => {
    const support = groupChannels(channels).find((g) => g.label === "Hỗ trợ")!;
    expect(support.channels.filter((c) => c.type !== ChannelType.Category).map((c) => c.name)).toEqual([
      "faq",
      "ticket",
    ]);
  });

  test("a field with no type limit also offers the categories", () => {
    const support = groupChannels(channels).find((g) => g.label === "Hỗ trợ")!;
    expect(support.channels[0].type).toBe(ChannelType.Category);
  });

  test("a type limit leaves out categories, forums and empty groups", () => {
    const groups = groupChannels(channels, WRITABLE_CHANNEL_TYPES);
    const names = groups.flatMap((g) => g.channels.map((c) => c.name));

    expect(names).not.toContain("Chung");
    expect(names).not.toContain("Hỗ trợ");
    expect(names).not.toContain("ideas");
    expect(names).toContain("voice");
    expect(names).toContain("bug-123");
    expect(groups.map((g) => g.label)).toEqual([
      "Không có danh mục",
      "Chung",
      "Hỗ trợ",
      "Thread",
    ]);
  });

  test("a category whose channels are all filtered out is not listed", () => {
    const groups = groupChannels(
      [ch("1", "Trống", ChannelType.Category), ch("2", "v", ChannelType.Voice, { parent_id: "1" })],
      [ChannelType.Text]
    );
    expect(groups).toEqual([]);
  });

  test("a deleted category does not hide its channels", () => {
    const groups = groupChannels([ch("9", "orphan", ChannelType.Text, { parent_id: "gone" })]);
    expect(groups.map((g) => g.label)).toEqual(["Không có danh mục"]);
  });

  test("undefined entries and an empty list are fine", () => {
    expect(groupChannels([undefined, undefined])).toEqual([]);
    expect(groupChannels([])).toEqual([]);
  });
});

describe("search and labels", () => {
  test("matches by name without accents, and by ID", () => {
    const item = { id: ID, name: "Đặng Hỗ trợ" };
    expect(matchesPickSearch(item, "dang")).toBe(true);
    expect(matchesPickSearch(item, "ho tro")).toBe(true);
    expect(matchesPickSearch(item, "12345678")).toBe(true);
    expect(matchesPickSearch(item, "xyz")).toBe(false);
    expect(matchesPickSearch(item, "")).toBe(true);
  });

  test("an ID that is not in the list is shown with a note, an expression as it is", () => {
    expect(unresolvedLabel(ID)).toBe(`${ID} (không có trong danh sách)`);
    expect(unresolvedLabel("{{channel.id}}")).toBe("{{channel.id}}");
  });
});

describe("channelTypesForNode", () => {
  test("a node that sends a message does not offer categories", () => {
    for (const node of ["action_message_create", "action_transcript", "action_message_purge", "action_message_pin"]) {
      const types = channelTypesForNode(node)!;
      expect(types).not.toContain(ChannelType.Category);
      expect(types).not.toContain(ChannelType.Forum);
      expect(types).toContain(ChannelType.Text);
    }
  });

  test("nodes that need one kind of channel offer only that", () => {
    expect(channelTypesForNode("action_member_voice_move")).toEqual([ChannelType.Voice, ChannelType.Stage]);
    expect(channelTypesForNode("action_forum_post_create")).toEqual([ChannelType.Forum, ChannelType.Media]);
    expect(channelTypesForNode("action_thread_member_add")).not.toContain(ChannelType.Text);
  });

  test("channel edit, get and delete keep every type, a category included", () => {
    expect(channelTypesForNode("action_channel_delete")).toBeUndefined();
    expect(channelTypesForNode("action_channel_edit")).toBeUndefined();
    expect(channelTypesForNode("action_channel_get")).toBeUndefined();
  });

  test("fitsChannelTypes", () => {
    expect(fitsChannelTypes(ChannelType.Category, undefined)).toBe(true);
    expect(fitsChannelTypes(ChannelType.Category, WRITABLE_CHANNEL_TYPES)).toBe(false);
    expect(fitsChannelTypes(ChannelType.Text, WRITABLE_CHANNEL_TYPES)).toBe(true);
  });
});
