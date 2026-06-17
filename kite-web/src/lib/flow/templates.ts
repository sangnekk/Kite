import { Edge, Node } from "@xyflow/react";
import { getLayoutedElements } from "./layout";
import { getEdgeId, getNodeId } from "./nodes";
import { NodeData } from "./dataSchema";
import {
  CoinsIcon,
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
  return [getModerationTemplate(), getWelcomerTemplate(), getEconomyTemplate()];
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
                user_target: "{{arg('user')}}",
                audit_log_reason: "{{arg('reason')}}",
                member_ban_delete_message_duration_seconds: "3600",
              },
            },
            {
              id: moderationBanActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{arg('user').mention}} đã bị cấm.",
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
                user_target: "{{arg('user')}}",
                audit_log_reason: "{{arg('reason')}}",
              },
            },
            {
              id: moderationUnbanActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{arg('user').mention}} đã được bỏ cấm.",
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
                user_target: "{{arg('user')}}",
                audit_log_reason: "{{arg('reason')}}",
              },
            },
            {
              id: moderationKickActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{arg('user').mention}} đã bị đuổi.",
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
                user_target: "{{arg('user')}}",
                member_timeout_duration_seconds:
                  "{{arg('duration')}}",
                audit_log_reason: "{{arg('reason')}}",
              },
            },
            {
              id: moderationMuteActionResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "Người dùng {{arg('user').mention}} đã bị tắt tiếng trong `{{arg('duration')}}` giây.",
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

export function getEconomyTemplate(): Template {
  // /balance
  const balanceEntryNodeId = getNodeId();
  const balanceErrorHandlerNodeId = getNodeId();
  const balanceGetNodeId = getNodeId();
  const balanceResponseNodeId = getNodeId();
  const balanceErrorResponseNodeId = getNodeId();

  // /daily
  const dailyEntryNodeId = getNodeId();
  const dailyErrorHandlerNodeId = getNodeId();
  const dailyCooldownNodeId = getNodeId();
  const dailyConditionNodeId = getNodeId();
  const dailyConditionItemNodeId = getNodeId();
  const dailyAddNodeId = getNodeId();
  const dailySuccessResponseNodeId = getNodeId();
  const dailyConditionElseNodeId = getNodeId();
  const dailyWaitResponseNodeId = getNodeId();
  const dailyErrorResponseNodeId = getNodeId();

  // /pay
  const payEntryNodeId = getNodeId();
  const payOptionUserNodeId = getNodeId();
  const payOptionAmountNodeId = getNodeId();
  const payErrorHandlerNodeId = getNodeId();
  const payTransferNodeId = getNodeId();
  const payResponseNodeId = getNodeId();
  const payErrorResponseNodeId = getNodeId();

  // /top
  const topEntryNodeId = getNodeId();
  const topErrorHandlerNodeId = getNodeId();
  const topLeaderboardNodeId = getNodeId();
  const topResponseNodeId = getNodeId();
  const topErrorResponseNodeId = getNodeId();

  return {
    name: "Kinh tế",
    description:
      "Các lệnh kinh tế dựng sẵn: xem số dư, nhận thưởng hằng ngày, chuyển tiền và bảng xếp hạng.",
    icon: CoinsIcon,
    inputs: [
      {
        key: "currency_variable_id",
        label: "Biến tiền tệ",
        description:
          "ID của một biến (scoped) dùng để lưu số dư của người dùng. Hãy tạo biến này trước.",
        type: "text",
        required: true,
      },
      {
        key: "cooldown_variable_id",
        label: "Biến cooldown (cho /daily)",
        description:
          "ID của một biến (scoped) dùng để lưu thời điểm nhận thưởng gần nhất.",
        type: "text",
        required: true,
      },
      {
        key: "daily_amount",
        label: "Thưởng mỗi ngày",
        description: "Số tiền người dùng nhận được mỗi lần dùng /daily.",
        type: "text",
        required: true,
      },
    ],
    commands: [
      {
        name: "balance",
        description: "Xem số dư của bạn.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: balanceEntryNodeId,
              type: "entry_command",
              data: {
                name: "balance",
                description: "Xem số dư của bạn.",
              },
            },
            {
              id: balanceErrorHandlerNodeId,
              type: "control_error_handler",
              data: {},
            },
            {
              id: balanceGetNodeId,
              type: "action_balance_get",
              data: {
                variable_id: inputs.currency_variable_id,
                economy_user_target: "{{user.id}}",
                temporary_name: "balance",
              },
            },
            {
              id: balanceResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content: "💰 Số dư của bạn: **{{var('balance')}}**",
                },
              },
            },
            {
              id: balanceErrorResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "❌ Không lấy được số dư. Hãy kiểm tra lại biến tiền tệ.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: balanceEntryNodeId,
              target: balanceErrorHandlerNodeId,
            },
            {
              id: getEdgeId(),
              source: balanceErrorHandlerNodeId,
              sourceHandle: "default",
              target: balanceGetNodeId,
            },
            {
              id: getEdgeId(),
              source: balanceGetNodeId,
              target: balanceResponseNodeId,
            },
            {
              id: getEdgeId(),
              source: balanceErrorHandlerNodeId,
              sourceHandle: "error",
              target: balanceErrorResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "daily",
        description: "Nhận thưởng hằng ngày.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: dailyEntryNodeId,
              type: "entry_command",
              data: {
                name: "daily",
                description: "Nhận thưởng hằng ngày.",
              },
            },
            {
              id: dailyErrorHandlerNodeId,
              type: "control_error_handler",
              data: {},
            },
            {
              id: dailyCooldownNodeId,
              type: "action_cooldown_check",
              data: {
                variable_id: inputs.cooldown_variable_id,
                cooldown_scope: "{{user.id}}",
                cooldown_duration: "86400",
                temporary_name: "cd",
              },
            },
            {
              id: dailyConditionNodeId,
              type: "control_condition_compare",
              data: {
                condition_base_value: "{{var('cd').remaining}}",
              },
            },
            {
              id: dailyConditionItemNodeId,
              type: "control_condition_item_compare",
              data: {
                condition_item_mode: "less_than_or_equal",
                condition_item_value: "0",
              },
            },
            {
              id: dailyAddNodeId,
              type: "action_balance_add",
              data: {
                variable_id: inputs.currency_variable_id,
                economy_user_target: "{{user.id}}",
                economy_amount: inputs.daily_amount,
                temporary_name: "new_balance",
              },
            },
            {
              id: dailySuccessResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content: `🎉 Bạn đã nhận **${inputs.daily_amount}** 💰! Số dư hiện tại: **{{var('new_balance')}}**`,
                },
              },
            },
            {
              id: dailyConditionElseNodeId,
              type: "control_condition_item_else",
              data: {},
            },
            {
              id: dailyWaitResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "⏳ Bạn đã nhận thưởng hôm nay rồi. Hãy đợi **{{var('cd').remaining}}** giây nữa.",
                },
                message_ephemeral: true,
              },
            },
            {
              id: dailyErrorResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content: "❌ Có lỗi khi nhận thưởng. Vui lòng thử lại sau.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: dailyEntryNodeId,
              target: dailyErrorHandlerNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyErrorHandlerNodeId,
              sourceHandle: "default",
              target: dailyCooldownNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyCooldownNodeId,
              target: dailyConditionNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyConditionNodeId,
              target: dailyConditionItemNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyConditionItemNodeId,
              target: dailyAddNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyAddNodeId,
              target: dailySuccessResponseNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyConditionNodeId,
              target: dailyConditionElseNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyConditionElseNodeId,
              target: dailyWaitResponseNodeId,
            },
            {
              id: getEdgeId(),
              source: dailyErrorHandlerNodeId,
              sourceHandle: "error",
              target: dailyErrorResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "pay",
        description: "Chuyển tiền cho người dùng khác.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: payEntryNodeId,
              type: "entry_command",
              data: {
                name: "pay",
                description: "Chuyển tiền cho người dùng khác.",
              },
            },
            {
              id: payOptionUserNodeId,
              type: "option_command_argument",
              data: {
                name: "user",
                description: "Người nhận tiền.",
                command_argument_type: "user",
                command_argument_required: true,
              },
            },
            {
              id: payOptionAmountNodeId,
              type: "option_command_argument",
              data: {
                name: "amount",
                description: "Số tiền muốn chuyển.",
                command_argument_type: "integer",
                command_argument_required: true,
              },
            },
            {
              id: payErrorHandlerNodeId,
              type: "control_error_handler",
              data: {},
            },
            {
              id: payTransferNodeId,
              type: "action_balance_transfer",
              data: {
                variable_id: inputs.currency_variable_id,
                economy_user_target: "{{user.id}}",
                economy_recipient: "{{arg('user').id}}",
                economy_amount: "{{arg('amount')}}",
              },
            },
            {
              id: payResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "✅ Đã chuyển **{{arg('amount')}}** 💰 cho {{arg('user').mention}}.",
                },
              },
            },
            {
              id: payErrorResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "❌ Chuyển tiền thất bại — có thể bạn không đủ số dư.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: payOptionUserNodeId,
              target: payEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: payOptionAmountNodeId,
              target: payEntryNodeId,
            },
            {
              id: getEdgeId(),
              source: payEntryNodeId,
              target: payErrorHandlerNodeId,
            },
            {
              id: getEdgeId(),
              source: payErrorHandlerNodeId,
              sourceHandle: "default",
              target: payTransferNodeId,
            },
            {
              id: getEdgeId(),
              source: payTransferNodeId,
              target: payResponseNodeId,
            },
            {
              id: getEdgeId(),
              source: payErrorHandlerNodeId,
              sourceHandle: "error",
              target: payErrorResponseNodeId,
            },
          ],
        }),
      },
      {
        name: "top",
        description: "Xem người dùng có số dư cao nhất.",
        flowSource: (inputs) => ({
          nodes: [
            {
              id: topEntryNodeId,
              type: "entry_command",
              data: {
                name: "top",
                description: "Xem người dùng có số dư cao nhất.",
              },
            },
            {
              id: topErrorHandlerNodeId,
              type: "control_error_handler",
              data: {},
            },
            {
              id: topLeaderboardNodeId,
              type: "action_balance_leaderboard",
              data: {
                variable_id: inputs.currency_variable_id,
                economy_limit: "1",
                temporary_name: "leaderboard",
              },
            },
            {
              id: topResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content:
                    "🏆 Người giàu nhất: <@{{var('leaderboard')[0].scope}}> với **{{var('leaderboard')[0].balance}}** 💰",
                },
              },
            },
            {
              id: topErrorResponseNodeId,
              type: "action_response_create",
              data: {
                message_data: {
                  content: "❌ Chưa có dữ liệu bảng xếp hạng.",
                },
                message_ephemeral: true,
              },
            },
          ],
          edges: [
            {
              id: getEdgeId(),
              source: topEntryNodeId,
              target: topErrorHandlerNodeId,
            },
            {
              id: getEdgeId(),
              source: topErrorHandlerNodeId,
              sourceHandle: "default",
              target: topLeaderboardNodeId,
            },
            {
              id: getEdgeId(),
              source: topLeaderboardNodeId,
              target: topResponseNodeId,
            },
            {
              id: getEdgeId(),
              source: topErrorHandlerNodeId,
              sourceHandle: "error",
              target: topErrorResponseNodeId,
            },
          ],
        }),
      },
    ],
    eventListeners: [],
  };
}
