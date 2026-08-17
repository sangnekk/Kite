import { z } from "zod";

export const userResultSchema = z.object({
  id: z.string().describe("The ID of the user"),
  username: z.string().describe("The username of the user"),
  discriminator: z.string().describe("The discriminator of the user"),
  display_name: z.string().describe("The display name of the user"),
  avatar_url: z.string().describe("The avatar URL of the user"),
});

export const memberResultSchema = userResultSchema.extend({
  nick: z.string().describe("The nickname of the member"),
  avatar_url: z.string().describe("The avatar URL of the member"),
});

export const channelResultSchema = z.object({
  id: z.string().describe("The ID of the channel"),
  name: z.string().describe("The name of the channel"),
  type: z
    .enum(["text", "voice", "category", "news", "store", "stage"])
    .describe("The type of the channel"),
});

export const guildResultSchema = z.object({
  id: z.string().describe("The ID of the guild"),
  name: z.string().describe("The name of the guild"),
  icon_url: z.string().describe("The icon URL of the guild"),
});

export const messageResultSchema = z.object({
  id: z.string().describe("The ID of the message"),
  channel_id: z
    .string()
    .describe("The ID of the channel the message was sent in"),
  content: z.string().describe("The content of the message"),
  author: userResultSchema.describe("The author of the message if it's a DM"),
  member: memberResultSchema
    .optional()
    .describe("The author of the message if it's in a server"),
});

export const roleResultSchema = z.object({
  id: z.string().describe("The ID of the role"),
  name: z.string().describe("The name of the role"),
  color: z.string().describe("The color of the role"),
  hoist: z.boolean().describe("Whether the role is hoisted"),
  mentionable: z.boolean().describe("Whether the role is mentionable"),
});

export const nodeActionResponseCreateResultSchema = messageResultSchema;

export const nodeActionResponseEditResultSchema = messageResultSchema;

export const nodeActionMessageCreateResultSchema = messageResultSchema;

export const nodeActionMessageEditResultSchema = messageResultSchema;

export const nodeActionPrivateMessageCreateResultSchema = messageResultSchema;

export const nodeActionMessageGetResultSchema = messageResultSchema;

export const nodeActionUserGetResultSchema = userResultSchema;

export const nodeActionMemberGetResultSchema = memberResultSchema;

export const nodeActionChannelGetResultSchema = channelResultSchema;

export const nodeActionGuildGetResultSchema = guildResultSchema;

export const nodeActionRoleGetResultSchema = roleResultSchema;

export const nodeActionRoleCreateResultSchema = roleResultSchema;

export const nodeActionRoleEditResultSchema = roleResultSchema;

export const nodeActionChannelCreateResultSchema = channelResultSchema;

export const nodeActionChannelEditResultSchema = channelResultSchema;

export const nodeActionThreadCreateResultSchema = channelResultSchema;

export const nodeActionForumPostCreateResultSchema = channelResultSchema;

export const nodeActionRegexMatchResultSchema = z.object({
  matched: z.boolean().describe("Whether the regex pattern matched the text"),
  groups: z
    .array(z.string())
    .describe("Captured groups (index 0 is the full match)"),
});

export const nodeActionEventEmitResultSchema = z.object({
  event_id: z.string(),
  event_name: z.string(),
  subscriber_count: z.number(),
  mode: z.enum(["async", "sync"]),
});

const customTableRowResultSchema = z.record(z.unknown());

export const nodeActionTableInsertResultSchema = z.object({
  id: z.string(),
  row: customTableRowResultSchema,
});

export const nodeActionTableFindOneResultSchema = z.object({
  found: z.boolean(),
  row: customTableRowResultSchema.nullable(),
});

export const nodeActionTableQueryResultSchema = z.object({
  rows: z.array(customTableRowResultSchema),
  count: z.number(),
  total_count: z.number(),
});

export const nodeActionTableMutationResultSchema = z.object({
  affected_rows: z.number(),
});
