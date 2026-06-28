import { Edge, Node, NodeProps as XYNodeProps } from "@xyflow/react";
import z from "zod";
import { FlowNodeData } from "../types/flow.gen";

const numericRegex = /^[0-9]+$/;
const decimalRegex = /^[0-9]+(\.[0-9]+)?$/;
const placeholderRegex = /^\{\{[a-z0-9_'().]+\}\}$/;

export interface FlowData {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export type NodeData = FlowNodeData & Record<string, unknown>;

export type NodeProps = XYNodeProps<Node<NodeData>>;

export type NodeType = Node<NodeData>;

export const auditLogReasonSchema = z.string().max(512).optional();

export const conditionItemModeSchema = z
  .literal("equal")
  .or(z.literal("not_equal"))
  .or(z.literal("greater_than"))
  .or(z.literal("less_than"))
  .or(z.literal("greater_than_or_equal"))
  .or(z.literal("less_than_or_equal"))
  .or(z.literal("contains"))
  .or(z.literal("starts_with"))
  .or(z.literal("ends_with"))
  .or(z.literal("has_role"))
  .or(z.literal("not_has_role"))
  .or(z.literal("has_permission"))
  .or(z.literal("not_has_permission"));

export const nodeBaseDataSchema = z.object({
  custom_label: z.string().optional(),
  result_key: z
    .string()
    .max(32)
    .regex(
      /^[a-z0-9_]+$/,
      "Must be lowercase without special characters or spaces"
    )
    .optional(),
});

export const nodeEntryCommandDataSchema = nodeBaseDataSchema.extend({
  name: z
    .string()
    .max(32)
    .min(1)
    .regex(
      /^[-_a-z0-9]{1,32}( [-_a-z0-9]{1,32}){0,2}$/,
      "Must be only lowercase alphanumeric characters and underscores, and have at most 3 words"
    ),
  description: z.string().max(100).min(1),
  // Trigger types. Absence means slash enabled, prefix disabled (backwards
  // compatible with commands created before this existed).
  command_disable_slash: z.boolean().optional(),
  command_enable_prefix: z.boolean().optional(),
});

export const nodeOptionCommandArgumentDataSchema = nodeBaseDataSchema.extend({
  name: z
    .string()
    .max(32)
    .min(1)
    .regex(/^[a-z0-9_]+$/),
  description: z.string().max(100).min(1),
  command_argument_type: z
    .literal("string")
    .or(z.literal("integer"))
    .or(z.literal("boolean"))
    .or(z.literal("user"))
    .or(z.literal("channel"))
    .or(z.literal("role"))
    .or(z.literal("mentionable"))
    .or(z.literal("number"))
    .or(z.literal("attachment")),
  command_argument_required: z.boolean().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  max_length: z.number().optional(),
  choices: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(100),
      })
    )
    .optional(),
});

export const nodeOptionCommandPermissionsSchema = nodeBaseDataSchema.extend({
  command_permissions: z.string().regex(numericRegex),
});

export const nodeOptionCommandBotPermissionsSchema = nodeBaseDataSchema.extend({
  command_bot_permissions: z.string().regex(numericRegex),
});

export const nodeOptionCommandContextsSchema = nodeBaseDataSchema.extend({
  command_disabled_contexts: z
    .array(
      z
        .literal("guild")
        .or(z.literal("bot_dm"))
        .or(z.literal("private_channel"))
    )
    .optional(),
  command_disabled_integrations: z
    .array(z.literal("guild_install").or(z.literal("user_install")))
    .optional(),
});

export const nodeOptionEventFilterSchema = nodeBaseDataSchema.extend({
  event_filter_target: z.string(),
  event_filter_mode: conditionItemModeSchema,
  event_filter_value: z.string().max(1000).min(1),
});

export const nodeEntryEventDataSchema = nodeBaseDataSchema.extend({
  event_type: z.string(),
});

export const nodeEntryComponentButtonDataSchema = nodeBaseDataSchema.extend({});

export const nodeMessageDataSchema = z.object({
  content: z.string().max(2000),
  allowed_mentions: z
    .object({
      parse: z
        .array(
          z.union([
            z.literal("users"),
            z.literal("roles"),
            z.literal("everyone"),
          ])
        )
        .optional(),
    })
    .optional(),
});

export const nodeActionResponseCreateDataSchema = nodeBaseDataSchema
  .extend({
    message_data: nodeMessageDataSchema.optional(),
    message_template_id: z.string().optional(),
    message_ephemeral: z.boolean().optional(),
  })
  .refine(
    (data) => !!data.message_data || !!data.message_template_id,
    "Either message_data or message_template_id is required"
  );

export const nodeActionResponseEditDataSchema = nodeBaseDataSchema
  .extend({
    message_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex))
      .or(z.literal("@original")),
    message_data: nodeMessageDataSchema.optional(),
    message_template_id: z.string().optional(),
  })
  .refine(
    (data) => !!data.message_data || !!data.message_template_id,
    "Either message_data or message_template_id is required"
  );

export const nodeActionResponseDeleteDataSchema = nodeBaseDataSchema.extend({
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .or(z.literal("@original")),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionResponseDeferDataSchema = nodeBaseDataSchema.extend({
  message_ephemeral: z.boolean().optional(),
});

export const nodeSuspendResponseModalDataSchema = nodeBaseDataSchema.extend({
  modal_data: z.object({
    title: z.string().max(45).min(1),
    components: z
      .array(
        z.object({
          components: z
            .array(
              z.object({
                custom_id: z.string().max(100).min(1),
                label: z.string().max(45).min(1),
                style: z.literal(1).or(z.literal(2)),
                required: z.boolean().optional(),
                min_length: z.number().optional(),
                max_length: z.number().optional(),
                value: z.string().max(4000).min(1).optional(),
                placeholder: z.string().max(4000).min(1).optional(),
              })
            )
            .min(1)
            .max(1),
        })
      )
      .min(1)
      .max(5),
  }),
});

export const nodeActionMessageCreateDataSchema = nodeBaseDataSchema
  .extend({
    channel_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex))
      .describe("The channel to send the message to"),
    message_data: nodeMessageDataSchema.optional(),
    message_template_id: z.string().optional(),
  })
  .refine(
    (data) => !!data.message_data || !!data.message_template_id,
    "Either message_data or message_template_id is required"
  );

export const nodeActionPrivateMessageCreateDataSchema = nodeBaseDataSchema
  .extend({
    user_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    message_data: nodeMessageDataSchema.optional(),
    message_template_id: z.string().optional(),
  })
  .refine(
    (data) => !!data.message_data || !!data.message_template_id,
    "Either message_data or message_template_id is required"
  );

export const nodeActionMessageEditDataSchema = nodeBaseDataSchema
  .extend({
    channel_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    message_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    message_data: nodeMessageDataSchema.optional(),
    message_template_id: z.string().optional(),
  })
  .refine(
    (data) => !!data.message_data || !!data.message_template_id,
    "Either message_data or message_template_id is required"
  );

export const nodeActionMessageDeleteDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const emojiDataSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export const nodeActionMessageReactionCreateDataSchema =
  nodeBaseDataSchema.extend({
    channel_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    message_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    emoji_data: emojiDataSchema,
  });

export const nodeActionMessageReactionDeleteDataSchema =
  nodeBaseDataSchema.extend({
    channel_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    message_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    emoji_data: emojiDataSchema,
  });

export const nodeActionMemberBanDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  member_ban_delete_message_duration_seconds: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberUnbanDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberKickDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberTimeoutDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  member_timeout_duration_seconds: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberEditDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  member_data: z.object({
    nick: z.string(),
  }),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberRoleAddDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  role_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberRoleRemoveDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  role_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberVoiceMoveDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberVoiceDisconnectDataSchema =
  nodeBaseDataSchema.extend({
    user_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    audit_log_reason: auditLogReasonSchema,
  });

export const nodeActionMemberVoiceMuteDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  member_voice_mute: z.boolean().optional(),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberVoiceDeafenDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  member_voice_deafen: z.boolean().optional(),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMemberGetDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});

export const nodeActionUserGetDataSchema = nodeBaseDataSchema.extend({
  user_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});

export const nodeActionChannelGetDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});

export const channelDataSchema = z.object({
  name: z.string().max(100).min(1),
  type: z.number().optional(),
  topic: z.string().max(1000).min(1).optional(),
  nsfw: z.boolean().optional(),
  bitrate: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  user_limit: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  position: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  parent: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  permission_overwrites: z
    .array(
      z.object({
        id: z
          .string()
          .regex(numericRegex)
          .or(z.string().regex(placeholderRegex)),
        type: z.literal(0).or(z.literal(1)).optional(),
        allow: z
          .string()
          .regex(numericRegex)
          .or(z.string().regex(placeholderRegex)),
        deny: z
          .string()
          .regex(numericRegex)
          .or(z.string().regex(placeholderRegex)),
      })
    )
    .optional(),
  invitable: z.boolean().optional(),
});

// Role color and permissions are stored as numbers (matching the Go RoleData
// struct), so unlike channel bitrate/position they are not template strings.
export const roleDataSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.number().optional(),
  hoist: z.boolean().optional(),
  // Decimal permission bitmask as a string (like command_permissions) so the
  // permission picker can be reused and large 64-bit bitmasks stay precise.
  permissions: z.string().regex(numericRegex).optional(),
  mentionable: z.boolean().optional(),
});

export const nodeActionChannelCreateDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  channel_data: channelDataSchema,
  audit_log_reason: auditLogReasonSchema,
  temporary_name: z.string().optional(),
});

export const nodeActionChannelEditDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  channel_data: channelDataSchema,
  audit_log_reason: auditLogReasonSchema,
  temporary_name: z.string().optional(),
});

export const nodeActionChannelDeleteDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionThreadCreateDataSchema = nodeBaseDataSchema.extend({
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  channel_data: channelDataSchema,
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionThreadMemberAddDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  user_target: z.string(),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionThreadMemberRemoveDataSchema = nodeBaseDataSchema.extend(
  {
    channel_target: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex)),
    user_target: z.string(),
    audit_log_reason: auditLogReasonSchema,
  }
);

export const nodeActionForumPostCreateDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  channel_data: channelDataSchema,
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionRoleGetDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  role_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});

export const nodeActionRoleCreateDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  role_data: roleDataSchema,
  audit_log_reason: auditLogReasonSchema,
  temporary_name: z.string().optional(),
});

export const nodeActionRoleEditDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  role_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  role_data: roleDataSchema,
  audit_log_reason: auditLogReasonSchema,
  temporary_name: z.string().optional(),
});

export const nodeActionRoleDeleteDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  role_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
});

export const nodeActionGuildGetDataSchema = nodeBaseDataSchema.extend({
  guild_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});

export const nodeActionMessageGetDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex))
    .optional(),
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  temporary_name: z.string().optional(),
});


export const nodeActionVariableSetSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  variable_scope: z.string().optional(),
  variable_value: z.string(),
  variable_operation: z
    .literal("overwrite")
    .or(z.literal("append"))
    .or(z.literal("prepend"))
    .or(z.literal("increment"))
    .or(z.literal("decrement")),
});

export const nodeActionVariableDeleteSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  variable_scope: z.string().optional(),
});

export const nodeActionVariableGetSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  variable_scope: z.string().optional(),
});

export const nodeActionHttpRequestDataSchema = nodeBaseDataSchema.extend({
  http_request_data: z.object({
    url: z.string().url(),
    method: z
      .literal("GET")
      .or(z.literal("POST"))
      .or(z.literal("PUT"))
      .or(z.literal("PATCH"))
      .or(z.literal("DELETE")),
  }),
});

export const nodeActionAiChatCompletionDataSchema = nodeBaseDataSchema.extend({
  ai_chat_completion_data: z.object({
    // Model is a registry key resolved server-side; the available keys are
    // config-driven, so it is validated as a free-form string here and checked
    // against the active model registry by the backend.
    model: z.string().optional(),
    system_prompt: z.string().max(2000).optional(),
    prompt: z.string().max(2000).min(1),
    max_completion_tokens: z
      .string()
      .regex(numericRegex)
      .or(z.string().regex(placeholderRegex))
      .optional(),
  }),
});

export const nodeActionAiWebSearchCompletionDataSchema =
  nodeBaseDataSchema.extend({
    ai_chat_completion_data: z.object({
      // See nodeActionAiChatCompletionDataSchema: config-driven registry key.
      model: z.string().optional(),
      system_prompt: z.string().max(2000).optional(),
      prompt: z.string().max(2000).min(1),
      max_completion_tokens: z
        .string()
        .regex(numericRegex)
        .or(z.string().regex(placeholderRegex))
        .optional(),
    }),
  });

export const nodeActionExpressionEvaluateDataSchema = nodeBaseDataSchema.extend(
  {
    expression: z
      .string()
      .max(2000)
      .refine((val) => !val.startsWith("{{"), {
        message:
          "In most cases, you don't need to use the double curly brackets around the expression here. Only use them if you want to include a placeholder in the expression.",
      }),
  }
);

export const nodeActionTimeNowDataSchema = nodeBaseDataSchema.extend({
  time_format: z.string().optional(),
  time_timezone: z.string().optional(),
});

export const nodeActionListPickDataSchema = nodeBaseDataSchema.extend({
  list_pick_input: z.string(),
});

export const nodeActionTextTransformDataSchema = nodeBaseDataSchema.extend({
  text_input: z.string(),
  text_operation: z.string(),
  text_arg1: z.string().optional(),
  text_arg2: z.string().optional(),
});

export const nodeActionJSONParseDataSchema = nodeBaseDataSchema.extend({
  json_input: z.string(),
});

export const nodeActionJSONBuildDataSchema = nodeBaseDataSchema.extend({
  json_input: z.string(),
});

export const nodeActionBalanceGetDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_user_target: z.string().optional(),
});

export const nodeActionBalanceAddDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_user_target: z.string().optional(),
  economy_amount: z.string(),
});

export const nodeActionBalanceRemoveDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_user_target: z.string().optional(),
  economy_amount: z.string(),
  economy_allow_negative: z.boolean().optional(),
});

export const nodeActionBalanceSetDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_user_target: z.string().optional(),
  economy_amount: z.string(),
});

export const nodeActionBalanceTransferDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_user_target: z.string().optional(),
  economy_recipient: z.string(),
  economy_amount: z.string(),
  economy_allow_negative: z.boolean().optional(),
});

export const nodeActionBalanceLeaderboardDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  economy_limit: z.string().optional(),
});

export const nodeActionNumberFormatDataSchema = nodeBaseDataSchema.extend({
  number_input: z.string(),
  number_style: z.string().optional(),
  number_decimals: z.string().optional(),
});

export const nodeActionQRCreateDataSchema = nodeBaseDataSchema.extend({
  qr_bank: z.string().min(1, "Vui lòng chọn ngân hàng"),
  qr_account: z.string().min(1, "Vui lòng nhập số tài khoản"),
  qr_amount: z.string().optional(),
  qr_description: z.string().optional(),
  qr_template: z
    .literal("")
    .or(z.literal("compact"))
    .or(z.literal("qronly"))
    .or(z.literal("standee"))
    .optional(),
  qr_holder: z.string().optional(),
  qr_store: z.string().optional(),
  qr_hide_info: z.boolean().optional(),
  qr_full_account: z.boolean().optional(),
});

export const nodeActionListFormatDataSchema = nodeBaseDataSchema.extend({
  list_input: z.string(),
  list_item_template: z.string(),
  list_joiner: z.string().optional(),
});

export const nodeActionListJoinDataSchema = nodeBaseDataSchema.extend({
  list_input: z.string(),
  list_joiner: z.string().optional(),
});

export const nodeActionListLengthDataSchema = nodeBaseDataSchema.extend({
  list_input: z.string(),
});

export const nodeActionListSortDataSchema = nodeBaseDataSchema.extend({
  list_input: z.string(),
  list_sort_order: z.string().optional(),
});

export const nodeActionListReverseDataSchema = nodeBaseDataSchema.extend({
  list_input: z.string(),
});

export const nodeActionRegexMatchDataSchema = nodeBaseDataSchema.extend({
  text_input: z.string(),
  regex_pattern: z.string(),
  regex_flags: z.string().optional(),
});

export const nodeActionTimeMathDataSchema = nodeBaseDataSchema.extend({
  time_input: z.string(),
  time_amount: z.string(),
  time_unit: z.string().optional(),
  time_op: z.string().optional(),
  time_format: z.string().optional(),
  time_timezone: z.string().optional(),
});

export const nodeActionTimeDiffDataSchema = nodeBaseDataSchema.extend({
  time_a: z.string(),
  time_b: z.string(),
  time_unit: z.string().optional(),
});

export const nodeActionMessagePinDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMessageUnpinDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  message_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionMessagePurgeDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  message_purge_count: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionChannelSlowmodeDataSchema = nodeBaseDataSchema.extend({
  channel_target: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  channel_slowmode_seconds: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  audit_log_reason: auditLogReasonSchema,
});

export const nodeActionCooldownCheckDataSchema = nodeBaseDataSchema.extend({
  variable_id: z.string(),
  cooldown_scope: z.string().optional(),
  cooldown_duration: z.string(),
  cooldown_peek: z.boolean().optional(),
});

export const nodeActionRandomGenerateDataSchema = nodeBaseDataSchema.extend({
  random_min: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
  random_max: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
});

export const nodeActionLogDataSchema = nodeBaseDataSchema.extend({
  log_level: z
    .literal("debug")
    .or(z.literal("info"))
    .or(z.literal("warn"))
    .or(z.literal("error")),
  log_message: z.string().max(2000).min(1),
});

export const nodeConditionCompareDataSchema = nodeBaseDataSchema.extend({
  condition_base_value: z.string(),
  condition_allow_multiple: z.boolean().optional(),
});

export const nodeConditionItemCompareDataSchema = nodeBaseDataSchema.extend({
  condition_item_value: z.string().optional(),
  condition_item_mode: conditionItemModeSchema,
});

export const nodeControlLoopDataSchema = nodeBaseDataSchema.extend({
  loop_count: z
    .string()
    .regex(numericRegex)
    .or(z.string().regex(placeholderRegex)),
});

export const nodeControlSleepDataSchema = nodeBaseDataSchema.extend({
  sleep_duration_seconds: z
    .string()
    .regex(decimalRegex)
    .or(z.string().regex(placeholderRegex)),
});
