import { Edge, Node } from "@xyflow/react";
import { getLayoutedElements } from "./layout";
import { getEdgeId, getNodeId } from "./nodes";
import { NodeData } from "./dataSchema";
import {
  GavelIcon,
  LucideIcon,
  UserRoundPlusIcon,
} from "lucide-react";

export type Template = {
  name: string;
  description: string;
  icon: LucideIcon;
  inputs: {
    key: string;
    label: string;
    description: string;
    type: "text" | "textarea";
    required: boolean;
  }[];
  commands: {
    name: string;
    description: string;
    flowSource(inputs: Record<string, any>): {
      nodes: Omit<Node<NodeData>, "position">[];
      edges: Edge[];
    };
  }[];
  eventListeners: {
    source: string;
    type: string;
    description: string;
    flowSource(inputs: Record<string, any>): {
      nodes: Omit<Node<NodeData>, "position">[];
      edges: Edge[];
    };
  }[];
};

export function getTemplates() {
  return [getModerationTemplate(), getWelcomerTemplate()];
}

export function prepareTemplateFlow(flow: {
  nodes: Omit<Node<NodeData>, "position">[];
  edges: Edge[];
}) {
  return getLayoutedElements(
    flow.nodes.map((node) => ({
      ...node,
      position: { x: 0, y: 0 },
    })),
    flow.edges,
    {
      direction: "TB",
    }
  );
}

export function getModerationTemplate(): Template {
  const moderationBanEntryNodeId = getNodeId();
  const moderationBanOptionUserIdNodeId = getNodeId();
  const moderationBanOptionPermissionsNodeId = getNodeId();
  const moderationBanOptionReasonNodeId = getNodeId();
  const moderationBanActionMemberBanNodeId = getNodeId();
  const moderationBanActionResponseNodeId = getNodeId();

  const moderationUnbanEntryNodeId = getNodeId();
  const moderationUnbanOptionUserIdNodeId = getNodeId();
  const moderationUnbanOptionPermissionsNodeId = getNodeId();
  const moderationUnbanOptionReasonNodeId = getNodeId();
  const moderationUnbanActionMemberUnbanNodeId = getNodeId();
  const moderationUnbanActionResponseNodeId = getNodeId();

  const moderationKickEntryNodeId = getNodeId();
  const moderationKickOptionUserIdNodeId = getNodeId();
  const moderationKickOptionPermissionsNodeId = getNodeId();
  const moderationKickOptionReasonNodeId = getNodeId();
  const moderationKickActionMemberKickNodeId = getNodeId();
  const moderationKickActionResponseNodeId = getNodeId();

  const moderationMuteEntryNodeId = getNodeId();
  const moderationMuteOptionUserIdNodeId = getNodeId();
  const moderationMuteOptionPermissionsNodeId = getNodeId();
  const moderationMuteOptionDurationNodeId = getNodeId();
  const moderationMuteOptionReasonNodeId = getNodeId();
  const moderationMuteActionMemberTimeoutNodeId = getNodeId();
  const moderationMuteActionResponseNodeId = getNodeId();
  return {
    name: "Kiểm duyệt",
    description:
      "Một số lệnh kiểm duyệt để giúp bạn quản lý server.",
    icon: GavelIcon,
    inputs: [],
    commands: [
      {
        name: "ban",
        description: "Cấm một người dùng khỏi server.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: moderationBanEntryNodeId,
              type: "entry_command",
              data: {
                name: "ban",
                description: "Cấm một người dùng khỏi server.",
              },
            },
            {
              id: moderationBanOptionUserIdNodeId,
              type: "option_command_argument",
              data: {
                name: "user",
                description: "Người dùng cần cấm.",
                command_argument_type: "user",
                command_argument_required: true,
              },
            },
            {
              id: moderationBanOptionReasonNodeId,
              type: "option_command_argument",
              data: {
                name: "reason",
                description: "Lý do cấm.",
                command_argument_type: "string",
                command_argument_required: false,
              },
            },
            {
              id: moderationBanOptionPermissionsNodeId,
              type: "option_command_permissions",
              data: {
                command_permissions: "4",
              },
            },
            {
              id: moderationBanActionMemberBanNodeId,
              type: "action_member_ban",
              data: {
                user_target: "{{interaction.command.args.user}}",
                audit_log_reason: "{{interaction.command.args.reason}}",
                member_ban_delete_message_duration_seconds: "3600",
              },
            },
            {
              id: moderationBanActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{interaction.command.args.user.mention}} đã bị cấm.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: moderationBanOptionUserIdNodeId,
              target: moderationBanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationBanOptionPermissionsNodeId,
              target: moderationBanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationBanOptionReasonNodeId,
              target: moderationBanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationBanEntryNodeId,
              target: moderationBanActionMemberBanNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationBanActionMemberBanNodeId,
              target: moderationBanActionResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "unban",
        description: "Bỏ cấm một người dùng khỏi server.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: moderationUnbanEntryNodeId,
              type: "entry_command",
              data: {
                name: "unban",
                description: "Bỏ cấm một người dùng khỏi server.",
              },
            },
            {
              id: moderationUnbanOptionUserIdNodeId,
              type: "option_command_argument",
              data: {
                name: "user",
                description: "Người dùng cần bỏ cấm.",
                command_argument_type: "user",
                command_argument_required: true,
              },
            },
            {
              id: moderationUnbanOptionReasonNodeId,
              type: "option_command_argument",
              data: {
                name: "reason",
                description: "Lý do bỏ cấm.",
                command_argument_type: "string",
                command_argument_required: false,
              },
            },
            {
              id: moderationUnbanOptionPermissionsNodeId,
              type: "option_command_permissions",
              data: {
                command_permissions: "4",
              },
            },
            {
              id: moderationUnbanActionMemberUnbanNodeId,
              type: "action_member_unban",
              data: {
                user_target: "{{interaction.command.args.user}}",
                audit_log_reason: "{{interaction.command.args.reason}}",
              },
            },
            {
              id: moderationUnbanActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{interaction.command.args.user.mention}} đã được bỏ cấm.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: moderationUnbanOptionUserIdNodeId,
              target: moderationUnbanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationUnbanOptionReasonNodeId,
              target: moderationUnbanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationUnbanOptionPermissionsNodeId,
              target: moderationUnbanEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationUnbanEntryNodeId,
              target: moderationUnbanActionMemberUnbanNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationUnbanActionMemberUnbanNodeId,
              target: moderationUnbanActionResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "kick",
        description: "Đuổi một người dùng khỏi server.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: moderationKickEntryNodeId,
              type: "entry_command",
              data: {
                name: "kick",
                description: "Đuổi một người dùng khỏi server.",
              },
            },
            {
              id: moderationKickOptionUserIdNodeId,
              type: "option_command_argument",
              data: {
                name: "user",
                description: "Người dùng cần đuổi.",
                command_argument_type: "user",
                command_argument_required: true,
              },
            },
            {
              id: moderationKickOptionReasonNodeId,
              type: "option_command_argument",
              data: {
                name: "reason",
                description: "Lý do đuổi.",
                command_argument_type: "string",
                command_argument_required: false,
              },
            },
            {
              id: moderationKickOptionPermissionsNodeId,
              type: "option_command_permissions",
              data: {
                command_permissions: "2",
              },
            },
            {
              id: moderationKickActionMemberKickNodeId,
              type: "action_member_kick",
              data: {
                user_target: "{{interaction.command.args.user}}",
                audit_log_reason: "{{interaction.command.args.reason}}",
              },
            },
            {
              id: moderationKickActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{interaction.command.args.user.mention}} đã bị đuổi.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: moderationKickOptionUserIdNodeId,
              target: moderationKickEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationKickOptionReasonNodeId,
              target: moderationKickEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationKickOptionPermissionsNodeId,
              target: moderationKickEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationKickEntryNodeId,
              target: moderationKickActionMemberKickNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationKickActionMemberKickNodeId,
              target: moderationKickActionResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "mute",
        description: "Tắt tiếng một người dùng trong server.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: moderationMuteEntryNodeId,
              type: "entry_command",
              data: {
                name: "mute",
                description: "Tắt tiếng một người dùng trong server.",
              },
            },
            {
              id: moderationMuteOptionUserIdNodeId,
              type: "option_command_argument",
              data: {
                name: "user",
                description: "Người dùng cần tắt tiếng.",
                command_argument_type: "user",
                command_argument_required: true,
              },
            },
            {
              id: moderationMuteOptionDurationNodeId,
              type: "option_command_argument",
              data: {
                name: "duration",
                description: "Số giây tắt tiếng người dùng.",
                command_argument_type: "number",
                command_argument_required: true,
              },
            },
            {
              id: moderationMuteOptionReasonNodeId,
              type: "option_command_argument",
              data: {
                name: "reason",
                description: "Lý do tắt tiếng.",
                command_argument_type: "string",
                command_argument_required: false,
              },
            },
            {
              id: moderationMuteOptionPermissionsNodeId,
              type: "option_command_permissions",
              data: {
                command_permissions: "1099511627776",
              },
            },
            {
              id: moderationMuteActionMemberTimeoutNodeId,
              type: "action_member_timeout",
              data: {
                user_target: "{{interaction.command.args.user}}",
                member_timeout_duration_seconds:
                  "{{interaction.command.args.duration}}",
                audit_log_reason: "{{interaction.command.args.reason}}",
              },
            },
            {
              id: moderationMuteActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{interaction.command.args.user.mention}} đã bị tắt tiếng trong `{{interaction.command.args.duration}}` giây.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: moderationMuteOptionUserIdNodeId,
              target: moderationMuteEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationMuteOptionReasonNodeId,
              target: moderationMuteEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationMuteOptionDurationNodeId,
              target: moderationMuteEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationMuteOptionPermissionsNodeId,
              target: moderationMuteEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationMuteEntryNodeId,
              target: moderationMuteActionMemberTimeoutNodeId,
            },
            {
              id: getEdgeId(),
              source: moderationMuteActionMemberTimeoutNodeId,
              target: moderationMuteActionResponseNodeId,
            },
          ],
        }),
      },
    ],
    eventListeners: [],
  };
}

export function getWelcomerTemplate(): Template {
  const welcomerEntryNodeId = getNodeId();
  const welcomerActionMessageCreateNodeId = getNodeId();

  return {
    name: "Chào mừng",
    description: "Bộ lắng nghe sự kiện để chào mừng thành viên mới.",
    icon: UserRoundPlusIcon,
    inputs: [
      {
        key: "channel_id",
        label: "ID Kênh",
        description: "Kênh để gửi tin nhắn chào mừng.",
        type: "text",
        required: true,
      },
    ],
    commands: [],
    eventListeners: [
      {
        source: "discord",
        type: "guild_member_add",
        description: "Chào mừng thành viên mới vào server.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: welcomerEntryNodeId,
              type: "entry_event",
              data: {
                event_type: "guild_member_add",
                description: "Chào mừng thành viên mới vào server.",
              },
            },
            {
              id: welcomerActionMessageCreateNodeId,
              type: "action_message_create",
              data: {
                channel_target: inputs.channel_id,
                message_data: {
                  content: "Chào mừng {{event.user.mention}} đến với server!",
                },
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: welcomerEntryNodeId,
              target: welcomerActionMessageCreateNodeId,
            },
          ],
        }),
      },
    ],
  };
}
