import { useFlowContext } from "@/lib/flow/context";
import { NodeData } from "@/lib/flow/dataSchema";
import { getNodeValues } from "@/lib/flow/nodes";
import { Edge, getIncomers, Node, useEdges, useNodes } from "@xyflow/react";
import { VariableIcon } from "lucide-react";
import { useMemo } from "react";
import PlaceholderExplorer from "../common/PlaceholderExplorer";
import { isSelectType } from "@/lib/message/schema";

// Placeholders of a select menu interaction ({{select}}), see
// kite-service/pkg/eval/select.go.
const selectPlaceholders: FlowPlaceholderGroup[] = [
  {
    label: "Menu chọn",
    placeholders: [
      { label: "Giá trị đã chọn (đầu tiên)", value: "select.value" },
      { label: "Tất cả giá trị đã chọn", value: "select.values" },
      { label: "Nhãn đã chọn", value: "select.labels" },
      { label: "Số mục đã chọn", value: "select.count" },
      { label: "Người dùng đã chọn", value: "select.users" },
      { label: "Vai trò đã chọn", value: "select.roles" },
      { label: "Kênh đã chọn", value: "select.channels" },
      { label: "Người dùng & vai trò đã chọn", value: "select.mentionables" },
      { label: "Custom ID của thành phần", value: "interaction.component.custom_id" },
    ],
  },
  {
    label: "Lựa chọn (trong nhánh của lựa chọn)",
    placeholders: [
      { label: "Giá trị", value: "option.value" },
      { label: "Nhãn", value: "option.label" },
      { label: "Mô tả", value: "option.description" },
      { label: "Vị trí", value: "option.index" },
    ],
  },
];

function messageHasSelect(components: any[] | undefined): boolean {
  return (components ?? []).some(
    (c) => isSelectType(c?.type) || messageHasSelect(c?.components)
  );
}

export interface FlowPlaceholderGroup {
  label: string;
  placeholders: { label: string; value: string }[];
}

// useFlowPlaceholders computes the placeholder groups available in the current
// flow context (global, command args, parent node results, temp variables...).
// Shared between the explorer button and the inline autocomplete.
export function useFlowPlaceholders(): FlowPlaceholderGroup[] {
  const nodePlaceholders = useNodePlaceholders();
  const commandPlaceholders = useCommandPlaceholders();
  const globalPlaceholders = useGlobalPlaceholders();

  return useMemo(
    () => [...commandPlaceholders, ...globalPlaceholders, ...nodePlaceholders],
    [commandPlaceholders, globalPlaceholders, nodePlaceholders]
  );
}

export default function FlowPlaceholderExplorer({
  onSelect,
  hideBrackets,
}: {
  onSelect: (value: string) => void;
  hideBrackets?: boolean;
}) {
  const placeholders = useFlowPlaceholders();

  return (
    <div className="absolute top-1.5 right-1.5 z-20">
      <PlaceholderExplorer
        onSelect={onSelect}
        placeholders={placeholders}
        hideBrackets={hideBrackets}
      >
        <VariableIcon
          className="h-5.5 w-5.5 text-muted-foreground hover:text-foreground cursor-pointer"
          role="button"
        />
      </PlaceholderExplorer>
    </div>
  );
}

function useGlobalPlaceholders() {
  const contextType = useFlowContext((c) => c.type);

  const res: FlowPlaceholderGroup[] = [
    ...(contextType === "component_select" ? selectPlaceholders : []),
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
          label: "User Display Name",
          value: `user.display_name`,
        },
        {
          label: "User Nickname",
          value: `user.nick`,
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
    {
      label: "App",
      placeholders: [
        {
          label: "App User ID",
          value: `app.user.id`,
        },
        {
          label: "App User Mention",
          value: `app.user.mention`,
        },
      ],
    },
  ];

  if (contextType === "event_discord") {
    res.push({
      label: "Message",
      placeholders: [
        { label: "Message ID", value: `message.id` },
        { label: "Message Content", value: `message.content` },
      ],
    });
    // Reaction events (Message Reaction Add/Remove)
    res.push({
      label: "Reaction",
      placeholders: [
        { label: "Emoji Name", value: `event.emoji.name` },
        { label: "Emoji ID", value: `event.emoji.id` },
        { label: "Emoji Animated", value: `event.emoji.animated` },
      ],
    });
    // Voice State Update event (new state Discord sends, no "before")
    res.push({
      label: "Voice",
      placeholders: [
        { label: "Voice Channel ID", value: `event.voice.channel_id` },
        { label: "Self Mute", value: `event.voice.self_mute` },
        { label: "Self Deaf", value: `event.voice.self_deaf` },
        { label: "Self Video", value: `event.voice.self_video` },
        { label: "Self Stream", value: `event.voice.self_stream` },
        { label: "Server Mute", value: `event.voice.mute` },
        { label: "Server Deaf", value: `event.voice.deaf` },
      ],
    });
    // Message Delete Bulk event
    res.push({
      label: "Event",
      placeholders: [
        { label: "Deleted Message IDs", value: `event.message_ids` },
      ],
    });
  }

  if (contextType === "event_custom") {
    res.push({
      label: "Custom Event",
      placeholders: [
        { label: "Event", value: `event` },
        { label: "Event Name", value: `event.name` },
        { label: "Event Payload", value: `event.payload` },
        { label: "Event Timestamp", value: `event.timestamp` },
      ],
    });
  }

  return res;
}

function useCommandPlaceholders() {
  const nodes = useNodes();

  const argNodes = useMemo(
    () => nodes.filter((n) => n.type === "option_command_argument"),
    [nodes]
  );

  const contextType = useFlowContext((c) => c.type);
  if (contextType !== "command") {
    return [];
  }

  // TODO: take arg type into account
  return [
    {
      label: "Command",
      placeholders: argNodes.map((n) => ({
        label: `Command Arg '${n.data.name}'`,
        value: `arg('${n.data.name}')`,
      })),
    },
  ];
}

function useNodePlaceholders() {
  const nodes = useNodes();
  const edges = useEdges();

  // Optimize or debounce this?
  return useMemo(() => {
    let parents: Node<NodeData>[] = [];
    for (const node of nodes) {
      if (node.selected) {
        parents = getParentNodes(node, nodes, edges);
        break;
      }
    }

    const nodeItems: { label: string; value: string }[] = [];
    const resultKeyItems: { label: string; value: string }[] = [];
    const componentItems: { label: string; value: string }[] = [];
    let hasSelectParent = false;
    let hasLoopParent = false;

    const seenResultKeys = new Set<string>();

    for (const parent of parents) {
      if (
        parent.type?.startsWith("action_") ||
        parent.type === "control_error_handler"
      ) {
        let label = parent.data.custom_label;
        if (!label) {
          const data = getNodeValues(parent.type!);
          label = data.defaultTitle;
        }

        nodeItems.push({ label, value: `result('${parent.id}')` });
      }

      if (
        parent.data.temporary_name &&
        !seenResultKeys.has(parent.data.temporary_name)
      ) {
        seenResultKeys.add(parent.data.temporary_name);

        resultKeyItems.push({
          label: `Biến tạm '${parent.data.temporary_name}'`,
          value: `var('${parent.data.temporary_name}')`,
        });
      }

      if (messageHasSelect((parent.data.message_data as any)?.components)) {
        hasSelectParent = true;
      }
      if (parent.type === "control_loop" && parent.data.loop_items !== undefined) {
        hasLoopParent = true;
      }

      if (parent?.type === "suspend_response_modal") {
        if (!parent.data.modal_data?.components) {
          continue;
        }

        for (const row of parent.data.modal_data.components) {
          if (!row?.components) {
            continue;
          }

          for (const component of row.components) {
            componentItems.push({
              label: component.label ?? "Unknown Input",
              value: `input('${component.custom_id}')`,
            });
          }
        }
      }
    }

    const res: FlowPlaceholderGroup[] = [];

    if (hasSelectParent) {
      res.push(...selectPlaceholders);
    }

    if (hasLoopParent) {
      res.push({
        label: "Vòng lặp",
        placeholders: [
          { label: "Phần tử hiện tại", value: "item" },
          { label: "Vị trí (từ 0)", value: "index" },
        ],
      });
    }

    if (componentItems.length > 0) {
      res.push({
        label: "Modal Inputs",
        placeholders: componentItems,
      });
    }

    if (resultKeyItems.length > 0) {
      res.push({
        label: "Biến tạm",
        placeholders: resultKeyItems,
      });
    }

    if (nodeItems.length > 0) {
      res.push({
        label: "Node Results",
        placeholders: nodeItems,
      });
    }

    return res;
  }, [nodes, edges]);
}

function getParentNodes(current: Node, nodes: Node[], edges: Edge[]) {
  const res: Node[] = [];
  const visited = new Set<string>();

  function traverse(node: Node) {
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);

    const incomers = getIncomers(node, nodes, edges);
    for (const incomer of incomers) {
      res.push(incomer);
      traverse(incomer);
    }
  }

  traverse(current);
  return res;
}
