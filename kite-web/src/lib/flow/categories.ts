// Node category/section definitions, shared by the flow editor's node explorer
// and the catalog generator (scripts/gen-flow-catalog.ts). Kept in a plain
// module (no React) so build scripts can import it.

export type NodeCategorySection = {
  title: string;
  nodeTypes: string[];
  contextTypes: string[] | null;
};

export const categoryLabels: Record<string, string> = {
  action: "Hành động",
  control_flow: "Điều khiển",
  option: "Tùy chọn",
  integration: "Tích hợp",
};

export const nodeCategories = {
  option: [
    {
      title: "Lệnh",
      nodeTypes: [
        "option_command_argument",
        "option_command_permissions",
        "option_command_bot_permissions",
        "option_command_contexts",
      ],
      contextTypes: ["command"],
    },
    {
      title: "Sự kiện",
      nodeTypes: ["option_event_filter"],
      contextTypes: ["event_discord"],
    },
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
      title: "Thoại",
      nodeTypes: [
        "action_member_voice_move",
        "action_member_voice_disconnect",
        "action_member_voice_mute",
        "action_member_voice_deafen",
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
        "action_role_create",
        "action_role_edit",
        "action_role_delete",
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
      title: "Cơ sở dữ liệu",
      nodeTypes: [
        "action_table_insert",
        "action_table_find_one",
        "action_table_query",
        "action_table_update",
        "action_table_delete",
      ],
      contextTypes: null,
    },
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
      nodeTypes: ["action_text_transform", "action_regex_match"],
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
        "action_list_sort",
        "action_list_reverse",
        "action_json_parse",
        "action_json_build",
      ],
      contextTypes: null,
    },
    {
      title: "Thời gian",
      nodeTypes: ["action_time_now", "action_time_math", "action_time_diff"],
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
    {
      title: "Sự kiện nội bộ",
      nodeTypes: ["action_event_emit"],
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
  integration: [
    {
      title: "Mã QR (VietQR)",
      nodeTypes: ["action_qr_create"],
      contextTypes: null,
    },
  ],
} satisfies Record<string, NodeCategorySection[]>;

export type NodeCategory = keyof typeof nodeCategories;
