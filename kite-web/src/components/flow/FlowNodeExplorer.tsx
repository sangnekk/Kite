import { useFlowContext } from "@/lib/flow/context";
import { NodeValues, createNode, getNodeValues } from "@/lib/flow/nodes";
import { useReactFlow } from "@xyflow/react";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { DragEvent, useMemo, useState } from "react";
import DynamicIcon from "../icons/DynamicIcon";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";

const categoryLabels: Record<string, string> = {
  action: "Hành động",
  control_flow: "Điều khiển",
  option: "Tùy chọn",
};

const nodeCategories = {
  option: [
    {
      title: "Lệnh",
      nodeTypes: [
        "option_command_argument",
        "option_command_permissions",
        "option_command_contexts",
      ],
      contextTypes: ["command"],
    },
    {
      title: "Sự kiện",
      nodeTypes: ["option_event_filter"],
      contextTypes: ["event_discord"],
    },
    /* {
      title: "Events",
      nodeTypes: ["option_event_filter"],
    }, */
  ],
  action: [
    {
      title: "Phản hồi",
      nodeTypes: [
        "action_response_create",
        "action_response_edit",
        "action_response_delete",
        "action_response_defer",
        "suspend_response_modal",
      ],
      contextTypes: ["command", "component_button"],
    },
    {
      title: "Tin nhắn",
      nodeTypes: [
        "action_message_create",
        "action_message_edit",
        "action_message_delete",
        "action_message_get",
        "action_private_message_create",
        "action_message_reaction_create",
        "action_message_reaction_delete",
        "action_message_pin",
        "action_message_unpin",
        "action_message_purge",
      ],
      contextTypes: null,
    },
    {
      title: "Thành viên",
      nodeTypes: [
        "action_member_ban",
        "action_member_unban",
        "action_member_kick",
        "action_member_timeout",
        "action_member_edit",
        "action_member_get",
      ],
      contextTypes: null,
    },
    {
      title: "Người dùng",
      nodeTypes: ["action_user_get"],
      contextTypes: null,
    },
    {
      title: "Vai trò",
      nodeTypes: [
        "action_member_role_add",
        "action_member_role_remove",
        "action_role_get",
      ],
      contextTypes: null,
    },

    {
      title: "Máy chủ",
      nodeTypes: ["action_guild_get"],
      contextTypes: null,
    },
    {
      title: "Kênh",
      nodeTypes: [
        "action_channel_create",
        "action_channel_edit",
        "action_channel_delete",
        "action_channel_get",
        "action_channel_slowmode",
      ],
      contextTypes: null,
    },
    {
      title: "Luồng & Diễn đàn",
      nodeTypes: [
        "action_thread_create",
        "action_thread_member_add",
        "action_thread_member_remove",
        "action_forum_post_create",
      ],
      contextTypes: null,
    },
  ],
  data: [
    {
      title: "Biến lưu trữ",
      nodeTypes: [
        "action_variable_set",
        "action_variable_delete",
        "action_variable_get",
      ],
      contextTypes: null,
    },
    {
      title: "Số dư (Kinh tế)",
      nodeTypes: [
        "action_balance_get",
        "action_balance_add",
        "action_balance_remove",
        "action_balance_set",
        "action_balance_transfer",
        "action_balance_leaderboard",
      ],
      contextTypes: null,
    },
    {
      title: "Cooldown",
      nodeTypes: ["action_cooldown_check"],
      contextTypes: null,
    },
    {
      title: "Văn bản",
      nodeTypes: ["action_text_transform"],
      contextTypes: null,
    },
    {
      title: "Số",
      nodeTypes: ["action_number_format"],
      contextTypes: null,
    },
    {
      title: "Danh sách & JSON",
      nodeTypes: [
        "action_list_pick",
        "action_list_format",
        "action_list_join",
        "action_list_length",
        "action_json_parse",
        "action_json_build",
      ],
      contextTypes: null,
    },
    {
      title: "Thời gian",
      nodeTypes: ["action_time_now"],
      contextTypes: null,
    },
    {
      title: "Ngẫu nhiên & Biểu thức",
      nodeTypes: ["action_random_generate", "action_expression_evaluate"],
      contextTypes: null,
    },
    {
      title: "Tích hợp (HTTP)",
      nodeTypes: ["action_http_request"],
      contextTypes: null,
    },
    {
      title: "Nhật ký",
      nodeTypes: ["action_log"],
      contextTypes: null,
    },
  ],
  control_flow: [
    {
      title: "Điều kiện",
      nodeTypes: [
        "control_condition_compare",
        "control_condition_user",
        "control_condition_channel",
        "control_condition_role",
      ],
      contextTypes: null,
    },
    {
      title: "Vòng lặp",
      nodeTypes: ["control_loop", "control_loop_exit"],
      contextTypes: null,
    },
    {
      title: "Lỗi",
      nodeTypes: ["control_error_handler"],
      contextTypes: null,
    },
    {
      title: "Tạm dừng",
      nodeTypes: ["control_sleep"],
      contextTypes: null,
    },
  ],
};

type NodeCategory = keyof typeof nodeCategories;

export default function FlowNodeExplorer({
  category,
}: {
  category: NodeCategory;
}) {
  const contextType = useFlowContext((c) => c.type);

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const normalizedSearch = search.toLowerCase().trim();
  const isSearching = normalizedSearch.length > 0;

  // When searching we look across every category so a block is never "missing"
  // just because it lives in another tab. When browsing we stay in the current tab.
  const sections = useMemo(() => {
    const cats = isSearching
      ? (Object.keys(nodeCategories) as NodeCategory[])
      : [category];

    return cats.flatMap((cat) =>
      nodeCategories[cat].map((s) => ({
        ...s,
        category: cat,
        key: `${cat}:${s.title}`,
        nodes: s.nodeTypes.map((t) => ({ values: getNodeValues(t), type: t })),
      }))
    );
  }, [category, isSearching]);

  const filteredSections = useMemo(() => {
    return sections
      .map((s) => ({
        ...s,
        nodes: s.nodes.filter(
          (n) =>
            n.values.defaultTitle.toLowerCase().includes(normalizedSearch) ||
            n.values.defaultDescription.toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter(
        (s) =>
          s.nodes.length > 0 &&
          (!s.contextTypes || s.contextTypes.includes(contextType))
      );
  }, [sections, contextType, normalizedSearch]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-5 flex-none">
        <div className="text-xl font-bold text-foreground mb-2">
          Khối{" "}
          {category === "action"
            ? "Hành động"
            : category === "data"
            ? "Dữ liệu & Tiện ích"
            : category === "control_flow"
            ? "Điều khiển"
            : "Tùy chọn"}
        </div>
        <div className="text-muted-foreground mb-5">
          {category === "action"
            ? "Khối Hành động giúp bạn thực hiện các thao tác trên Discord."
            : category === "data"
            ? "Khối Dữ liệu & Tiện ích giúp bạn lưu trữ, tính toán và biến đổi dữ liệu."
            : category === "control_flow"
            ? "Khối Điều khiển giúp bạn định nghĩa cách ứng dụng hoạt động."
            : "Khối Tùy chọn giúp bạn thêm tùy chọn cho các khối khác."}
        </div>
        <div className="relative">
          <Input
            placeholder="Tìm kiếm ..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SearchIcon className="absolute size-5 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="flex-auto mr-1">
        <div className="space-y-1 pl-3 pr-1 pb-5">
          {filteredSections.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-4 text-center">
              Không tìm thấy khối nào.
            </div>
          )}
          {filteredSections.map((section) => {
            const isOpen = isSearching || !collapsed[section.key];
            return (
              <div key={section.key}>
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 text-foreground font-medium mb-1 px-2 py-1.5 rounded-md hover:bg-muted/60 select-none"
                  onClick={() =>
                    !isSearching &&
                    setCollapsed((c) => ({
                      ...c,
                      [section.key]: !c[section.key],
                    }))
                  }
                >
                  {!isSearching &&
                    (isOpen ? (
                      <ChevronDownIcon className="size-4 flex-none text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="size-4 flex-none text-muted-foreground" />
                    ))}
                  <span className="flex-auto text-left">{section.title}</span>
                  {isSearching && (
                    <span className="flex-none text-xs font-normal text-muted-foreground">
                      {categoryLabels[section.category]}
                    </span>
                  )}
                  <span className="flex-none text-xs font-normal text-muted-foreground tabular-nums">
                    {section.nodes.length}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-2 mb-3">
                    {section.nodes.map((node) => (
                      <AvailableNode
                        key={node.type}
                        type={node.type}
                        values={node.values}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function AvailableNode({ type, values }: { type: string; values: NodeValues }) {
  const { addNodes, addEdges } = useReactFlow();

  function onStartDrag(e: DragEvent) {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  }

  function onClick() {
    const [nodes, edges] = createNode(type, {
      x: 0 + 200 * Math.random() - 100,
      y: 0 + 100 * Math.random() + 200,
    });
    addNodes(nodes);
    addEdges(edges);
  }

  return (
    <div
      className="p-2 hover:bg-muted rounded-md relative select-none cursor-grab"
      onDragStart={onStartDrag}
      onClick={onClick}
      draggable
    >
      <div className="flex items-start space-x-3">
        <div
          className="rounded-md w-8 h-8 flex justify-center items-center flex-none"
          style={{ backgroundColor: values.color }}
        >
          <DynamicIcon
            name={values.icon as any}
            className="h-5 w-5 text-white"
          />
        </div>
        <div className="overflow-hidden">
          <div className="font-medium text-foreground leading-5 mb-1 truncate">
            {values.defaultTitle}
          </div>
          <div className="text-sm text-muted-foreground">
            {values.defaultDescription}
          </div>
        </div>
      </div>
    </div>
  );
}
