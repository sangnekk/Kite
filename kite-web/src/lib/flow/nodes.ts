import { Edge, Node, XYPosition } from "@xyflow/react";
import { humanId } from "human-id";
import { useMemo } from "react";
import { ZodSchema } from "zod";
import { getUniqueId } from "../utils";
import {
  nodeActionChannelCreateDataSchema,
  nodeActionChannelDeleteDataSchema,
  nodeActionChannelEditDataSchema,
  nodeActionChannelGetDataSchema,
  nodeActionExpressionEvaluateDataSchema,
  nodeActionForumPostCreateDataSchema,
  nodeActionGuildGetDataSchema,
  nodeActionHttpRequestDataSchema,
  nodeActionLogDataSchema,
  nodeActionMemberBanDataSchema,
  nodeActionMemberEditDataSchema,
  nodeActionMemberGetDataSchema,
  nodeActionMemberKickDataSchema,
  nodeActionMemberRoleAddDataSchema,
  nodeActionMemberRoleRemoveDataSchema,
  nodeActionMemberTimeoutDataSchema,
  nodeActionMemberUnbanDataSchema,
  nodeActionMessageCreateDataSchema,
  nodeActionMessageDeleteDataSchema,
  nodeActionMessageEditDataSchema,
  nodeActionMessageGetDataSchema,
  nodeActionMessageReactionCreateDataSchema,
  nodeActionMessageReactionDeleteDataSchema,
  nodeActionPrivateMessageCreateDataSchema,
  nodeActionRandomGenerateDataSchema,
  nodeActionResponseCreateDataSchema,
  nodeActionResponseDeferDataSchema,
  nodeActionResponseDeleteDataSchema,
  nodeActionResponseEditDataSchema,
  nodeActionRobloxUserGetDataSchema,
  nodeActionRoleGetDataSchema,
  nodeActionThreadCreateDataSchema,
  nodeActionThreadMemberAddDataSchema,
  nodeActionThreadMemberRemoveDataSchema,
  nodeActionUserGetDataSchema,
  nodeActionVariableDeleteSchema,
  nodeActionVariableGetSchema,
  nodeActionVariableSetSchema,
  nodeConditionCompareDataSchema,
  nodeConditionItemCompareDataSchema,
  nodeControlLoopDataSchema,
  nodeControlSleepDataSchema,
  NodeData,
  nodeEntryCommandDataSchema,
  nodeEntryComponentButtonDataSchema,
  nodeEntryEventDataSchema,
  nodeOptionCommandArgumentDataSchema,
  nodeOptionCommandContextsSchema,
  nodeOptionCommandPermissionsSchema,
  nodeOptionEventFilterSchema,
  nodeSuspendResponseModalDataSchema,
} from "./dataSchema";
import {
  nodeActionChannelCreateResultSchema,
  nodeActionChannelGetResultSchema,
  nodeActionChannelEditResultSchema,
  nodeActionThreadCreateResultSchema,
  nodeActionForumPostCreateResultSchema,
  nodeActionGuildGetResultSchema,
  nodeActionMemberGetResultSchema,
  nodeActionMessageCreateResultSchema,
  nodeActionMessageEditResultSchema,
  nodeActionMessageGetResultSchema,
  nodeActionPrivateMessageCreateResultSchema,
  nodeActionResponseCreateResultSchema,
  nodeActionResponseEditResultSchema,
  nodeActionRobloxUserGetResultSchema,
  nodeActionRoleGetResultSchema,
} from "./resultSchema";

export const primaryColor = "#3B82F6";

export const actionColor = "#3b82f6";
export const entryColor = "#eab308";
export const errorColor = "#ef4444";
export const controlColor = "#22c55e";
export const optionColor = "#8b5cf6";
export const suspendColor = "#d946ef";

export interface NodeValues {
  color: string;
  icon: string;
  defaultTitle: string;
  defaultDescription: string;
  dataSchema?: ZodSchema;
  dataFields: string[];
  resultSchema?: ZodSchema;
  ownsChildren?: boolean;
  fixed?: boolean;
  creditsCost?: number | ((data: NodeData) => number);
}

export const nodeTypes: Record<string, NodeValues> = {
  entry_command: {
    color: entryColor,
    icon: "square-slash",
    defaultTitle: "Lệnh",
    defaultDescription:
      "Khởi đầu lệnh. Thả các hành động và tùy chọn vào đây!",
    dataSchema: nodeEntryCommandDataSchema,
    dataFields: ["name", "description"],
    fixed: true,
  },
  entry_event: {
    color: entryColor,
    icon: "satellite-dish",
    defaultTitle: "Lắng nghe sự kiện",
    defaultDescription:
      "Lắng nghe sự kiện để kích hoạt luồng. Thả các hành động vào đây!",
    dataSchema: nodeEntryEventDataSchema,
    dataFields: ["event_type", "description"],
    fixed: true,
  },
  entry_component_button: {
    color: entryColor,
    icon: "mouse-pointer-click",
    defaultTitle: "Nút",
    defaultDescription:
      "Kích hoạt khi người dùng nhấn nút. Thả các hành động vào đây!",
    dataSchema: nodeEntryComponentButtonDataSchema,
    dataFields: [],
    fixed: true,
  },
  action_response_create: {
    color: actionColor,
    icon: "message-circle-reply",
    defaultTitle: "Tạo tin nhắn phản hồi",
    defaultDescription: "Bot trả lời tương tác bằng tin nhắn",
    dataSchema: nodeActionResponseCreateDataSchema,
    resultSchema: nodeActionResponseCreateResultSchema,
    dataFields: [
      "message_template_id",
      "message_data",
      "message_ephemeral",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_response_edit: {
    color: actionColor,
    icon: "pen",
    defaultTitle: "Sửa tin nhắn phản hồi",
    defaultDescription: "Bot chỉnh sửa tin nhắn phản hồi tương tác hiện có",
    dataSchema: nodeActionResponseEditDataSchema,
    resultSchema: nodeActionResponseEditResultSchema,
    dataFields: [
      "response_target",
      "message_template_id",
      "message_data",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_response_delete: {
    color: actionColor,
    icon: "message-circle-x",
    defaultTitle: "Xóa tin nhắn phản hồi",
    defaultDescription: "Bot xóa tin nhắn phản hồi tương tác hiện có",
    dataSchema: nodeActionResponseDeleteDataSchema,
    dataFields: ["response_target", "custom_label"],
    creditsCost: 1,
  },
  action_response_defer: {
    color: actionColor,
    icon: "message-circle-question",
    defaultTitle: "Trì hoãn phản hồi",
    defaultDescription:
      "Bot trì hoãn phản hồi tương tác để có thêm thời gian xử lý",
    dataSchema: nodeActionResponseDeferDataSchema,
    dataFields: ["message_ephemeral", "custom_label"],
    creditsCost: 1,
  },
  action_message_create: {
    color: actionColor,
    icon: "message-circle-plus",
    defaultTitle: "Tạo tin nhắn kênh",
    defaultDescription: "Bot gửi tin nhắn đến kênh",
    dataSchema: nodeActionMessageCreateDataSchema,
    resultSchema: nodeActionMessageCreateResultSchema,
    dataFields: [
      "channel_target",
      "message_template_id",
      "message_data",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_message_edit: {
    color: actionColor,
    icon: "pen",
    defaultTitle: "Sửa tin nhắn kênh",
    defaultDescription: "Bot chỉnh sửa tin nhắn hiện có trong kênh",
    dataSchema: nodeActionMessageEditDataSchema,
    resultSchema: nodeActionMessageEditResultSchema,
    dataFields: [
      "channel_target",
      "message_target",
      "message_template_id",
      "message_data",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_private_message_create: {
    color: actionColor,
    icon: "message-circle-plus",
    defaultTitle: "Gửi tin nhắn riêng",
    defaultDescription:
      "Bot gửi tin nhắn riêng cho người dùng nếu người dùng cho phép",
    dataSchema: nodeActionPrivateMessageCreateDataSchema,
    resultSchema: nodeActionPrivateMessageCreateResultSchema,
    dataFields: [
      "user_target",
      "message_data",
      "message_template_id",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_message_delete: {
    color: actionColor,
    icon: "message-circle-x",
    defaultTitle: "Xóa tin nhắn kênh",
    defaultDescription: "Bot xóa tin nhắn hiện có trong kênh",
    dataSchema: nodeActionMessageDeleteDataSchema,
    dataFields: [
      "channel_target",
      "message_target",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_message_reaction_create: {
    color: actionColor,
    icon: "smile-plus",
    defaultTitle: "Tạo biểu tượng cảm xúc",
    defaultDescription: "Bot thêm biểu tượng cảm xúc vào tin nhắn",
    dataSchema: nodeActionMessageReactionCreateDataSchema,
    dataFields: [
      "channel_target",
      "message_target",
      "emoji_data",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_message_reaction_delete: {
    color: actionColor,
    icon: "frown",
    defaultTitle: "Xóa biểu tượng cảm xúc",
    defaultDescription: "Bot xóa biểu tượng cảm xúc khỏi tin nhắn",
    dataSchema: nodeActionMessageReactionDeleteDataSchema,
    dataFields: [
      "channel_target",
      "message_target",
      "emoji_data",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_ban: {
    color: actionColor,
    icon: "user-round-x",
    defaultTitle: "Cấm thành viên",
    defaultDescription: "Cấm thành viên khỏi server",
    dataSchema: nodeActionMemberBanDataSchema,
    dataFields: [
      "user_target",
      "member_ban_delete_message_duration_seconds",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_unban: {
    color: actionColor,
    icon: "user-round-check",
    defaultTitle: "Bỏ cấm thành viên",
    defaultDescription: "Bỏ cấm thành viên khỏi server",
    dataSchema: nodeActionMemberUnbanDataSchema,
    dataFields: ["user_target", "audit_log_reason", "custom_label"],
    creditsCost: 1,
  },
  action_member_kick: {
    color: actionColor,
    icon: "user-round-minus",
    defaultTitle: "Đuổi thành viên",
    defaultDescription: "Đuổi thành viên khỏi server",
    dataSchema: nodeActionMemberKickDataSchema,
    dataFields: ["user_target", "audit_log_reason", "custom_label"],
    creditsCost: 1,
  },
  action_member_timeout: {
    color: actionColor,
    icon: "message-circle-off",
    defaultTitle: "Tạm khóa thành viên",
    defaultDescription: "Tạm khóa thành viên trong server",
    dataSchema: nodeActionMemberTimeoutDataSchema,
    dataFields: [
      "user_target",
      "member_timeout_duration_seconds",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_edit: {
    color: actionColor,
    icon: "user-round-pen",
    defaultTitle: "Sửa biệt danh thành viên",
    defaultDescription: "Sửa thông tin thành viên trong server",
    dataSchema: nodeActionMemberEditDataSchema,
    dataFields: [
      "user_target",
      "member_nick",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_role_add: {
    color: actionColor,
    icon: "bookmark-plus",
    defaultTitle: "Thêm vai trò cho thành viên",
    defaultDescription: "Thêm vai trò cho thành viên",
    dataSchema: nodeActionMemberRoleAddDataSchema,
    dataFields: [
      "user_target",
      "role_target",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_role_remove: {
    color: actionColor,
    icon: "bookmark-minus",
    defaultTitle: "Xóa vai trò khỏi thành viên",
    defaultDescription: "Xóa vai trò khỏi thành viên",
    dataSchema: nodeActionMemberRoleRemoveDataSchema,
    dataFields: [
      "user_target",
      "role_target",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_member_get: {
    color: actionColor,
    icon: "user-round-search",
    defaultTitle: "Lấy thành viên",
    defaultDescription: "Lấy thành viên theo ID",
    dataSchema: nodeActionMemberGetDataSchema,
    resultSchema: nodeActionMemberGetResultSchema,
    dataFields: [
      "guild_target",
      "user_target",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_user_get: {
    color: actionColor,
    icon: "user-round-search",
    defaultTitle: "Lấy người dùng",
    defaultDescription: "Lấy người dùng theo ID",
    dataSchema: nodeActionUserGetDataSchema,
    dataFields: ["user_target", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_channel_get: {
    color: actionColor,
    icon: "folder-search",
    defaultTitle: "Lấy kênh",
    defaultDescription: "Lấy kênh theo ID",
    dataSchema: nodeActionChannelGetDataSchema,
    resultSchema: nodeActionChannelGetResultSchema,
    dataFields: ["channel_target", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_channel_create: {
    color: actionColor,
    icon: "folder-plus",
    defaultTitle: "Tạo kênh",
    defaultDescription: "Tạo một kênh mới",
    dataSchema: nodeActionChannelCreateDataSchema,
    resultSchema: nodeActionChannelCreateResultSchema,
    dataFields: [
      "guild_target",
      "channel_data",
      "audit_log_reason",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_channel_edit: {
    color: actionColor,
    icon: "folder-pen",
    defaultTitle: "Sửa kênh",
    defaultDescription: "Sửa kênh hoặc luồng",
    dataSchema: nodeActionChannelEditDataSchema,
    resultSchema: nodeActionChannelEditResultSchema,
    dataFields: [
      "channel_target",
      "channel_data",
      "audit_log_reason",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_channel_delete: {
    color: actionColor,
    icon: "folder-x",
    defaultTitle: "Xóa kênh",
    defaultDescription: "Xóa kênh hoặc luồng",
    dataSchema: nodeActionChannelDeleteDataSchema,
    dataFields: ["channel_target", "audit_log_reason", "custom_label"],
    creditsCost: 1,
  },
  action_thread_create: {
    color: actionColor,
    icon: "message-circle-plus",
    defaultTitle: "Tạo luồng",
    defaultDescription: "Tạo một luồng mới",
    dataSchema: nodeActionThreadCreateDataSchema,
    resultSchema: nodeActionThreadCreateResultSchema,
    dataFields: [
      "thread_data",
      "audit_log_reason",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_forum_post_create: {
    color: actionColor,
    icon: "message-circle-plus",
    defaultTitle: "Tạo bài diễn đàn",
    defaultDescription: "Tạo bài đăng trên diễn đàn",
    dataSchema: nodeActionForumPostCreateDataSchema,
    resultSchema: nodeActionForumPostCreateResultSchema,
    dataFields: [
      "channel_target",
      "channel_data",
      "audit_log_reason",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },

  action_thread_member_add: {
    color: actionColor,
    icon: "user-plus",
    defaultTitle: "Thêm thành viên vào luồng",
    defaultDescription: "Thêm thành viên vào luồng",
    dataSchema: nodeActionThreadMemberAddDataSchema,
    dataFields: [
      "channel_target",
      "user_target",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_thread_member_remove: {
    color: actionColor,
    icon: "user-minus",
    defaultTitle: "Xóa thành viên khỏi luồng",
    defaultDescription: "Xóa thành viên khỏi luồng",
    dataSchema: nodeActionThreadMemberRemoveDataSchema,
    dataFields: [
      "channel_target",
      "user_target",
      "audit_log_reason",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_role_get: {
    color: actionColor,
    icon: "bookmark",
    defaultTitle: "Lấy vai trò",
    defaultDescription: "Lấy vai trò theo ID",
    dataSchema: nodeActionRoleGetDataSchema,
    resultSchema: nodeActionRoleGetResultSchema,
    dataFields: [
      "guild_target",
      "role_target",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_guild_get: {
    color: actionColor,
    icon: "server",
    defaultTitle: "Lấy server",
    defaultDescription: "Lấy server / guild theo ID",
    dataSchema: nodeActionGuildGetDataSchema,
    resultSchema: nodeActionGuildGetResultSchema,
    dataFields: ["guild_target", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_message_get: {
    color: actionColor,
    icon: "mail-search",
    defaultTitle: "Lấy tin nhắn kênh",
    defaultDescription: "Lấy tin nhắn từ kênh",
    dataSchema: nodeActionMessageGetDataSchema,
    resultSchema: nodeActionMessageGetResultSchema,
    dataFields: ["message_target", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_roblox_user_get: {
    color: actionColor,
    icon: "gamepad",
    defaultTitle: "Lấy người dùng Roblox",
    defaultDescription: "Lấy người dùng Roblox theo ID hoặc tên",
    dataSchema: nodeActionRobloxUserGetDataSchema,
    resultSchema: nodeActionRobloxUserGetResultSchema,
    dataFields: [
      "roblox_user_target",
      "roblox_lookup_mode",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_variable_set: {
    color: actionColor,
    icon: "variable",
    defaultTitle: "Đặt biến lưu trữ",
    defaultDescription: "Đặt giá trị của biến lưu trữ",
    dataSchema: nodeActionVariableSetSchema,
    dataFields: [
      "variable_id",
      "variable_scope",
      "variable_operation",
      "variable_value",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_variable_delete: {
    color: actionColor,
    icon: "variable",
    defaultTitle: "Xóa biến lưu trữ",
    defaultDescription: "Xóa giá trị của biến lưu trữ",
    dataSchema: nodeActionVariableDeleteSchema,
    dataFields: ["variable_id", "variable_scope", "custom_label"],
    creditsCost: 1,
  },
  action_variable_get: {
    color: actionColor,
    icon: "variable",
    defaultTitle: "Lấy biến lưu trữ",
    defaultDescription: "Lấy giá trị của biến lưu trữ",
    dataSchema: nodeActionVariableGetSchema,
    dataFields: [
      "variable_id",
      "variable_scope",
      "temporary_name",
      "custom_label",
    ],
    creditsCost: 1,
  },
  action_http_request: {
    color: actionColor,
    icon: "webhook",
    defaultTitle: "Gửi yêu cầu API",
    defaultDescription: "Gửi yêu cầu API đến server bên ngoài",
    dataSchema: nodeActionHttpRequestDataSchema,
    dataFields: ["http_request_data", "temporary_name", "custom_label"],
    creditsCost: 3,
  },
  action_expression_evaluate: {
    color: actionColor,
    icon: "calculator",
    defaultTitle: "Tính toán giá trị",
    defaultDescription:
      "Thực hiện tính toán hoặc biểu thức logic và sử dụng kết quả sau",
    dataSchema: nodeActionExpressionEvaluateDataSchema,
    dataFields: ["expression", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_random_generate: {
    color: actionColor,
    icon: "dices",
    defaultTitle: "Tạo số ngẫu nhiên",
    defaultDescription: "Tạo số ngẫu nhiên trong khoảng",
    dataSchema: nodeActionRandomGenerateDataSchema,
    dataFields: ["random_min", "random_max", "temporary_name", "custom_label"],
    creditsCost: 1,
  },
  action_log: {
    color: actionColor,
    icon: "scroll-text",
    defaultTitle: "Ghi nhật ký",
    defaultDescription:
      "Ghi lại nội dung chỉ hiển thị trong nhật ký ứng dụng",
    dataSchema: nodeActionLogDataSchema,
    dataFields: ["log_level", "log_message", "custom_label"],
    creditsCost: 1,
  },
  control_condition_compare: {
    color: controlColor,
    icon: "arrow-left-right",
    defaultTitle: "Điều kiện so sánh",
    defaultDescription:
      "Thực hiện hành động dựa trên sự khác biệt giữa hai giá trị.",
    dataSchema: nodeConditionCompareDataSchema,
    dataFields: [
      "condition_compare_base_value",
      "condition_allow_multiple",
      "custom_label",
    ],
    ownsChildren: true,
  },
  control_condition_item_compare: {
    color: controlColor,
    icon: "circle-help",
    defaultTitle: "Điều kiện khớp",
    dataSchema: nodeConditionItemCompareDataSchema,
    defaultDescription: "Thực hiện hành động nếu hai giá trị bằng nhau.",
    dataFields: ["condition_item_compare_mode", "condition_item_compare_value"],
  },
  control_condition_user: {
    color: controlColor,
    icon: "user-search",
    defaultTitle: "Điều kiện người dùng",
    defaultDescription: "Thực hiện hành động dựa trên người dùng.",
    dataSchema: nodeConditionCompareDataSchema,
    dataFields: [
      "condition_user_base_value",
      "condition_allow_multiple",
      "custom_label",
    ],
    ownsChildren: true,
  },
  control_condition_item_user: {
    color: controlColor,
    icon: "circle-help",
    defaultTitle: "Khớp người dùng",
    dataSchema: nodeConditionItemCompareDataSchema,
    defaultDescription: "Thực hiện hành động nếu người dùng đáp ứng tiêu chí.",
    dataFields: ["condition_item_user_mode", "condition_item_user_value"],
  },
  control_condition_channel: {
    color: controlColor,
    icon: "folder-search",
    defaultTitle: "Điều kiện kênh",
    defaultDescription: "Thực hiện hành động dựa trên kênh.",
    dataSchema: nodeConditionCompareDataSchema,
    dataFields: [
      "condition_channel_base_value",
      "condition_allow_multiple",
      "custom_label",
    ],
    ownsChildren: true,
  },
  control_condition_item_channel: {
    color: controlColor,
    icon: "circle-help",
    defaultTitle: "Khớp kênh",
    dataSchema: nodeConditionItemCompareDataSchema,
    defaultDescription: "Thực hiện hành động nếu kênh đáp ứng tiêu chí.",
    dataFields: ["condition_item_channel_mode", "condition_item_channel_value"],
  },
  control_condition_role: {
    color: controlColor,
    icon: "bookmark",
    defaultTitle: "Điều kiện vai trò",
    defaultDescription: "Thực hiện hành động dựa trên vai trò.",
    dataSchema: nodeConditionCompareDataSchema,
    dataFields: [
      "condition_role_base_value",
      "condition_allow_multiple",
      "custom_label",
    ],
    ownsChildren: true,
  },
  control_condition_item_role: {
    color: controlColor,
    icon: "circle-help",
    defaultTitle: "Khớp vai trò",
    dataSchema: nodeConditionItemCompareDataSchema,
    defaultDescription: "Thực hiện hành động nếu vai trò đáp ứng tiêu chí.",
    dataFields: ["condition_item_role_mode", "condition_item_role_value"],
  },
  control_condition_item_else: {
    color: errorColor,
    icon: "circle-x",
    defaultTitle: "Ngược lại",
    defaultDescription: "Thực hiện hành động nếu không có điều kiện nào khác thỏa mãn.",
    dataFields: [],
    fixed: true,
  },
  control_error_handler: {
    color: errorColor,
    icon: "circle-alert",
    defaultTitle: "Xử lý lỗi",
    defaultDescription:
      "Xử lý lỗi xảy ra trong luồng sau khối này.",
    dataFields: ["temporary_name", "custom_label"],
    ownsChildren: true,
  },
  control_loop: {
    color: controlColor,
    icon: "repeat-2",
    defaultTitle: "Chạy vòng lặp",
    dataSchema: nodeControlLoopDataSchema,
    defaultDescription: "Chạy một tập hành động nhiều lần.",
    dataFields: ["loop_count", "custom_label"],
    ownsChildren: true,
  },
  control_loop_each: {
    color: controlColor,
    icon: "repeat-2",
    defaultTitle: "Mỗi lần lặp",
    defaultDescription: "Thực hiện hành động cho mỗi lần lặp.",
    dataFields: [],
    fixed: true,
  },
  control_loop_end: {
    color: controlColor,
    icon: "corner-down-right",
    defaultTitle: "Sau vòng lặp",
    defaultDescription: "Thực hiện hành động sau khi vòng lặp kết thúc.",
    dataFields: [],
    fixed: true,
  },
  control_loop_exit: {
    color: controlColor,
    icon: "log-out",
    defaultTitle: "Thoát vòng lặp",
    defaultDescription: "Thoát khỏi vòng lặp.",
    dataFields: [],
  },
  control_sleep: {
    color: controlColor,
    icon: "timer",
    defaultTitle: "Chờ",
    defaultDescription: "Tạm dừng luồng trong một khoảng thời gian.",
    dataSchema: nodeControlSleepDataSchema,
    dataFields: ["sleep_duration_seconds"],
  },
  option_command_argument: {
    color: optionColor,
    icon: "text-cursor-input",
    defaultTitle: "Tham số lệnh",
    defaultDescription: "Tham số cho lệnh.",
    dataSchema: nodeOptionCommandArgumentDataSchema,
    dataFields: [
      "name",
      "description",
      "command_argument_type",
      "command_argument_required",
      "command_argument_min_value",
      "command_argument_max_value",
      "command_argument_max_length",
      "command_argument_choices",
    ],
  },
  option_command_permissions: {
    color: optionColor,
    icon: "shield-check",
    defaultTitle: "Quyền lệnh",
    defaultDescription:
      "Chỉ cho phép người dùng có quyền nhất định sử dụng lệnh.",
    dataSchema: nodeOptionCommandPermissionsSchema,
    dataFields: ["command_permissions"],
  },
  option_command_contexts: {
    color: optionColor,
    icon: "map-pin",
    defaultTitle: "Ngữ cảnh lệnh",
    defaultDescription:
      "Xác định nơi lệnh có thể sử dụng. Mặc định, lệnh sẽ khả dụng mọi nơi.",
    dataSchema: nodeOptionCommandContextsSchema,
    dataFields: ["command_contexts", "command_integrations"],
  },
  option_event_filter: {
    color: optionColor,
    icon: "filter",
    defaultTitle: "Bộ lọc sự kiện",
    defaultDescription: "Lọc sự kiện dựa trên thuộc tính.",
    dataSchema: nodeOptionEventFilterSchema,
    dataFields: [
      "event_filter_target",
      "event_filter_mode",
      "event_filter_value",
    ],
  },
  suspend_response_modal: {
    color: suspendColor,
    icon: "picture-in-picture-2",
    defaultTitle: "Hiển thị Modal",
    defaultDescription:
      "Hiển thị modal cho người dùng và tạm dừng luồng cho đến khi người dùng gửi modal.",
    dataSchema: nodeSuspendResponseModalDataSchema,
    dataFields: ["modal_data", "custom_label"],
  },
};

const unknownNodeType: NodeValues = {
  color: "#ff0000",
  icon: "circle-help",
  defaultTitle: "Không xác định",
  defaultDescription: "Loại nút không xác định.",
  dataFields: [],
};

export function getNodeValues(nodeType: string): NodeValues {
  const values = nodeTypes[nodeType];
  if (!values) {
    return unknownNodeType;
  }
  return values;
}

export function useNodeValues(nodeType: string): NodeValues {
  return useMemo(() => getNodeValues(nodeType), [nodeType]);
}

const conditionChildType: Record<string, string> = {
  control_condition_compare: "control_condition_item_compare",
  control_condition_user: "control_condition_item_user",
  control_condition_channel: "control_condition_item_channel",
  control_condition_role: "control_condition_item_role",
};

export function createNode(
  type: string,
  position: XYPosition,
  props?: Partial<Node<NodeData>>
): [Node<NodeData>[], Edge[]] {
  const id = getNodeId();

  const nodes: Node<NodeData>[] = [
    {
      id,
      type,
      position,
      data: {},
      ...props,
    },
  ];
  const edges: Edge[] = [];

  // TODO?: connect option types to entry automatically?

  if (conditionChildType.hasOwnProperty(type)) {
    const [elseNodes, elseEdges] = createNode("control_condition_item_else", {
      x: position.x + 200,
      y: position.y + 200,
    });

    nodes.push(...elseNodes);
    edges.push({
      id: getEdgeId(),
      source: id,
      target: elseNodes[0].id,
      type: "fixed",
    });
    edges.push(...elseEdges);

    const [compareNodes, compareEdges] = createNode(conditionChildType[type], {
      x: position.x - 150,
      y: position.y + 200,
    });

    nodes.push(...compareNodes);
    edges.push({
      id: getEdgeId(),
      source: id,
      target: compareNodes[0].id,
      type: "fixed",
    });
    edges.push(...compareEdges);
  } else if (type === "control_loop") {
    const [endNodes, endEdges] = createNode("control_loop_end", {
      x: position.x + 200,
      y: position.y + 200,
    });

    nodes.push(...endNodes);
    edges.push({
      id: getEdgeId(),
      source: id,
      target: endNodes[0].id,
      type: "fixed",
    });
    edges.push(...endEdges);

    const [eachNodes, eachEdges] = createNode("control_loop_each", {
      x: position.x - 150,
      y: position.y + 200,
    });

    nodes.push(...eachNodes);
    edges.push({
      id: getEdgeId(),
      source: id,
      target: eachNodes[0].id,
      type: "fixed",
    });
    edges.push(...eachEdges);
  }

  return [nodes, edges];
}

export function getNodeId(): string {
  // This gives us a pool size of 75000
  // There is a small chance of collision, but reactflow handles it gracefully
  return humanId({
    separator: "",
    capitalize: false,
    addAdverb: false,
    adjectiveCount: 0,
  });
}

export function getEdgeId(): string {
  return getUniqueId().toString();
}
