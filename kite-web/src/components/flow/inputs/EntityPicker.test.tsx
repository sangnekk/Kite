import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const guild = (id: string, name: string) => ({
  id,
  name,
  description: "",
  icon_url: null,
  created_at: "",
});

let guilds = [guild("100000000000000001", "Server A")];

const ok = <T,>(data: T) => ({
  data: { success: true as const, data },
  isFetching: false,
  isError: false,
  refetch: () => {},
});

mock.module("@/lib/hooks/params", () => ({ useAppId: () => "app1" }));
mock.module("@/lib/api/queries", () => ({
  useAppStateGuildsQuery: () => ok(guilds),
  useAppStateGuildChannelsQuery: (_app: string, guildId: string | null) =>
    guildId
      ? ok([
          { id: "200000000000000001", type: 0, name: "chung", topic: "", position: 0 },
          { id: "200000000000000002", type: 2, name: "voice", topic: "", position: 1 },
          { id: "200000000000000009", type: 4, name: "Danh mục", topic: "", position: 2 },
        ])
      : { data: undefined, isFetching: false, isError: false, refetch: () => {} },
  useAppStateGuildRolesQuery: () =>
    ok([
      { id: "100000000000000001", name: "@everyone", color: 0, position: 0, managed: false },
      { id: "300000000000000001", name: "Quản trị", color: 0xff0000, position: 5, managed: false },
      { id: "300000000000000002", name: "Bot", color: 0, position: 1, managed: true },
    ]),
}));

const EntityPicker = (await import("./EntityPicker")).default;

const render = (config: any, value: string) =>
  renderToStaticMarkup(
    <EntityPicker config={config} value={value} onChange={() => {}} />
  );

describe("EntityPicker", () => {
  test("shows the name of the picked channel, not its ID", () => {
    const html = render({ kind: "channel" }, "200000000000000001");
    expect(html).toContain("#chung");
    expect(html).not.toContain("200000000000000001");
  });

  test("a category saved in a field that sends messages is called out", () => {
    const html = render({ kind: "channel", channelTypes: [0, 2, 5] }, "200000000000000009");
    expect(html).toContain("(loại kênh không phù hợp)");
    expect(html).toContain("Danh mục");
    expect(html).not.toContain("#Danh mục");
  });

  test("a channel of an allowed type has no such note", () => {
    const html = render({ kind: "channel", channelTypes: [0, 2, 5] }, "200000000000000001");
    expect(html).not.toContain("không phù hợp");
  });

  test("an empty channel shows the hint", () => {
    expect(render({ kind: "channel" }, "")).toContain("Chọn kênh...");
  });

  test("a channel that is not in the list keeps its ID and says so", () => {
    const html = render({ kind: "channel" }, "299999999999999999");
    expect(html).toContain("299999999999999999 (không có trong danh sách)");
  });

  test("an expression stays visible when the field is switched to the list", () => {
    expect(render({ kind: "channel" }, "{{channel.id}}")).toContain("{{channel.id}}");
  });

  test("the server list is only shown when the bot is in more than one server", () => {
    expect(render({ kind: "channel" }, "")).not.toContain("Chọn server...");

    guilds = [guild("100000000000000001", "Server A"), guild("100000000000000002", "Server B")];
    expect(render({ kind: "channel" }, "")).toContain("Server A");
    guilds = [guild("100000000000000001", "Server A")];
  });

  test("a role shows its name", () => {
    expect(render({ kind: "role" }, "300000000000000001")).toContain("Quản trị");
    expect(render({ kind: "role" }, "")).toContain("Chọn vai trò...");
  });

  test("a server field shows the name of the server", () => {
    expect(render({ kind: "guild" }, "100000000000000001")).toContain("Server A");
    expect(render({ kind: "guild" }, "")).toContain("Chọn server...");
  });

  test("a picked value can be cleared", () => {
    expect(render({ kind: "channel" }, "200000000000000001")).toContain("Bỏ chọn");
    expect(render({ kind: "channel" }, "")).not.toContain("Bỏ chọn");
  });
});
