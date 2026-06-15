import { z } from "zod";
import { getUniqueId } from "@/lib/utils";

const VARIABLE_RE = new RegExp("\\{\\{[^}]+\\}\\}");

const HOSTNAME_RE = new RegExp("localhost|\\.[a-zA-Z]{2,}$");
const urlRefinement: [(v: string) => boolean, string] = [
  (v) => {
    if (v.match(VARIABLE_RE)) return true;

    try {
      const url = new URL(v);
      return !!url.hostname.match(HOSTNAME_RE);
    } catch {
      return false;
    }
  },
  "Invalid URL",
];

const IMAGE_PATH_RE = new RegExp("\\.(png|jpg|jpeg|webp|gif)$");
const imageUrlRefinement: [(v: string) => boolean, string] = [
  (v) => {
    if (v.match(VARIABLE_RE)) return true;

    try {
      const url = new URL(v);
      return !!url.hostname.match(HOSTNAME_RE); // && !!url.pathname.match(IMAGE_PATH_RE) TODO: make better image url regex
    } catch {
      return false;
    }
  },
  "Invalid image URL",
];

export const uniqueIdSchema = z.number();

export type UniqueId = z.infer<typeof uniqueIdSchema>;

export const embedFooterTextSchema = z.optional(z.string().max(2048));

export type EmbedFooterText = z.infer<typeof embedFooterTextSchema>;

export const embedFooterIconUrlSchema = z.optional(
  z.string().refine(...imageUrlRefinement)
);

export type EmbedFooterIconUrl = z.infer<typeof embedFooterIconUrlSchema>;

export const embedFooterSchema = z.optional(
  z.object({
    text: embedFooterTextSchema,
    icon_url: embedFooterIconUrlSchema,
  })
);

export type EmbedFooter = z.infer<typeof embedFooterSchema>;

export const embedImageUrlSchema = z.optional(
  z.string().refine(...urlRefinement)
);

export type EmbedImageUrl = z.infer<typeof embedImageUrlSchema>;

export const embedImageSchema = z.optional(
  z.object({
    url: embedImageUrlSchema,
  })
);

export type EmbedImage = z.infer<typeof embedImageSchema>;

export const embedThumbnailUrlSchema = z.optional(
  z.string().refine(...urlRefinement)
);

export type EmbedThumbnailUrl = z.infer<typeof embedThumbnailUrlSchema>;

export const embedThumbnailSchema = z.optional(
  z.object({
    url: embedThumbnailUrlSchema,
  })
);

export type EmbedThumbnail = z.infer<typeof embedThumbnailSchema>;

export const embedAuthorNameSchema = z.string().min(1).max(256);

export type EmbedAuthorName = z.infer<typeof embedAuthorNameSchema>;

export const embedAuthorUrlSchema = z.optional(
  z.string().refine(...urlRefinement)
);

export type EmbedAuthorUrl = z.infer<typeof embedAuthorUrlSchema>;

export const embedAuthorIconUrlSchema = z.optional(
  z.string().refine(...imageUrlRefinement)
);

export type EmbedAuthorIconUrl = z.infer<typeof embedAuthorIconUrlSchema>;

export const embedAuthorSchema = z.optional(
  z.object({
    name: embedAuthorNameSchema,
    url: embedAuthorUrlSchema,
    icon_url: embedAuthorIconUrlSchema,
  })
);

export type EmbedAuthor = z.infer<typeof embedAuthorSchema>;

export const embedProviderNameSchema = z.string().min(1).max(256);

export type EmbedProviderName = z.infer<typeof embedProviderNameSchema>;

export const embedProviderUrlSchema = z.optional(
  z.string().refine(...urlRefinement)
);

export type EmbedProviderUrl = z.infer<typeof embedProviderUrlSchema>;

export const embedProviderSchema = z.optional(
  z.object({
    name: embedProviderNameSchema,
    url: embedProviderUrlSchema,
  })
);

export type EmbedProvider = z.infer<typeof embedProviderSchema>;

export const embedFieldNameSchema = z.string().min(1).max(256);

export type EmbedFieldName = z.infer<typeof embedFieldNameSchema>;

export const embedFieldValueSchema = z.string().min(1).max(1024);

export type EmbedFieldValue = z.infer<typeof embedFieldValueSchema>;

export const embedFieldInlineSchma = z.optional(z.boolean());

export type EmbedFieldInline = z.infer<typeof embedFieldInlineSchma>;

export const embedFieldSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  name: embedFieldNameSchema,
  value: embedFieldValueSchema,
  inline: embedFieldInlineSchma,
});

export type EmbedField = z.infer<typeof embedFieldSchema>;

export const embedTitleSchema = z.optional(z.string().max(256));

export type EmbedTitle = z.infer<typeof embedTitleSchema>;

export const embedDescriptionSchema = z.optional(z.string().max(4096));

export type EmbedDescription = z.infer<typeof embedDescriptionSchema>;

export const embedUrlSchema = z.optional(z.string().refine(...urlRefinement));

export type EmbedUrl = z.infer<typeof embedUrlSchema>;

export const embedTimestampSchema = z.optional(z.string());

export type EmbedTimestamp = z.infer<typeof embedTimestampSchema>;

export const embedColor = z.optional(z.number().max(16777215));

export type EmbedColor = z.infer<typeof embedColor>;

export const embedSchema = z
  .object({
    id: uniqueIdSchema.default(() => getUniqueId()),
    title: embedTitleSchema,
    description: embedDescriptionSchema,
    url: embedUrlSchema,
    timestamp: embedTimestampSchema,
    color: embedColor,
    footer: embedFooterSchema,
    author: embedAuthorSchema,
    provider: embedProviderSchema,
    image: embedImageSchema,
    thumbnail: embedThumbnailSchema,
    fields: z.array(embedFieldSchema).max(25).default([]),
  })
  .superRefine((data, ctx) => {
    if (
      !data.description &&
      !data.title &&
      !data.author &&
      !data.provider &&
      !data.footer &&
      !data.fields.length &&
      !data.image &&
      !data.thumbnail
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Description is required when no other fields are set",
      });
    }
  });

export type MessageEmbed = z.infer<typeof embedSchema>;

export const emojiSchema = z
  .object({
    id: z.optional(z.string()),
    name: z.string(),
    animated: z.boolean(),
  })
  .refine(
    (val) => val.id || val.name,
    "Emoji must have either an id or a name"
  );

export type Emoji = z.infer<typeof emojiSchema>;

export const buttonStyleSchema = z
  .literal(1)
  .or(z.literal(2))
  .or(z.literal(3))
  .or(z.literal(4))
  .or(z.literal(5));

export type MessageComponentButtonStyle = z.infer<typeof buttonStyleSchema>;

export const buttonSchema = z
  .object({
    id: uniqueIdSchema.default(() => getUniqueId()),
    type: z.literal(2),
    style: z.literal(1).or(z.literal(2)).or(z.literal(3)).or(z.literal(4)),
    label: z.string(),
    emoji: z.optional(emojiSchema),
    disabled: z.optional(z.boolean()),
    flow_source_id: z.string().default(() => getUniqueId().toString()),
  })
  .or(
    z.object({
      id: uniqueIdSchema.default(() => getUniqueId()),
      type: z.literal(2),
      style: z.literal(5),
      label: z.string(),
      emoji: z.optional(emojiSchema),
      url: z.string().refine(...urlRefinement),
      disabled: z.optional(z.boolean()),
      flow_source_id: z.string().default(() => getUniqueId().toString()),
    })
  )
  .superRefine((data, ctx) => {
    if (!data.emoji && !data.label) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["label"],
        message: "Label is required when no emoji is set",
      });
    }
  });

export type MessageComponentButton = z.infer<typeof buttonSchema>;

export const selectMenuOptionSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  label: z.string().min(1).max(100),
  description: z.optional(z.string().min(1).max(100)),
  emoji: z.optional(emojiSchema),
});

export type MessageComponentSelectMenuOption = z.infer<
  typeof selectMenuOptionSchema
>;

export const selectMenuSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(3),
  placeholder: z.optional(z.string().max(150)),
  disabled: z.optional(z.boolean()),
  options: z.array(selectMenuOptionSchema).min(1).max(25),
  flow_source_id: z.string().default(() => getUniqueId().toString()),
});

export type MessageComponentSelectMenu = z.infer<typeof selectMenuSchema>;

export const actionRowSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(1),
  components: z.array(buttonSchema.or(selectMenuSchema)).min(1).max(5),
});

export type MessageComponentActionRow = z.infer<typeof actionRowSchema>;

// ---------------------------------------------------------------------------
// Components V2
//
// When the message has the IS_COMPONENTS_V2 flag (see MESSAGE_FLAG_COMPONENTS_V2)
// the top-level `components` array holds these layout/content components instead
// of action rows, and `content`/`embeds` are not allowed.
// ---------------------------------------------------------------------------

export const MESSAGE_FLAG_COMPONENTS_V2 = 1 << 15; // 32768

export const mediaItemSchema = z
  .object({
    url: z.optional(z.string()),
    asset_id: z.optional(z.string()),
  })
  .refine(
    (v) => !!v.url || !!v.asset_id,
    "Media must have a URL or an uploaded file"
  );

export type MessageComponentMediaItem = z.infer<typeof mediaItemSchema>;

export const textDisplaySchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(10),
  content: z.string().min(1).max(4000),
});

export type MessageComponentTextDisplay = z.infer<typeof textDisplaySchema>;

export const separatorSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(14),
  divider: z.optional(z.boolean()),
  spacing: z.optional(z.literal(1).or(z.literal(2))),
});

export type MessageComponentSeparator = z.infer<typeof separatorSchema>;

export const thumbnailSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(11),
  media: mediaItemSchema,
  description: z.optional(z.string().max(1024)),
  spoiler: z.optional(z.boolean()),
});

export type MessageComponentThumbnail = z.infer<typeof thumbnailSchema>;

export const fileSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(13),
  media: mediaItemSchema,
  spoiler: z.optional(z.boolean()),
});

export type MessageComponentFile = z.infer<typeof fileSchema>;

export const mediaGalleryItemSchema = z.object({
  media: mediaItemSchema,
  description: z.optional(z.string().max(1024)),
  spoiler: z.optional(z.boolean()),
});

export type MessageComponentMediaGalleryItem = z.infer<
  typeof mediaGalleryItemSchema
>;

export const mediaGallerySchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(12),
  items: z.array(mediaGalleryItemSchema).min(1).max(10),
});

export type MessageComponentMediaGallery = z.infer<typeof mediaGallerySchema>;

// A section groups 1-3 text displays with a single accessory (a button or a
// thumbnail).
export const sectionAccessorySchema = z.union([buttonSchema, thumbnailSchema]);

export const sectionSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(9),
  components: z.array(textDisplaySchema).min(1).max(3),
  accessory: sectionAccessorySchema,
});

export type MessageComponentSection = z.infer<typeof sectionSchema>;

// Components allowed directly inside a container.
export const containerChildSchema = z.union([
  actionRowSchema,
  textDisplaySchema,
  sectionSchema,
  mediaGallerySchema,
  separatorSchema,
  fileSchema,
]);

export type MessageComponentContainerChild = z.infer<
  typeof containerChildSchema
>;

export const containerSchema = z.object({
  id: uniqueIdSchema.default(() => getUniqueId()),
  type: z.literal(17),
  accent_color: z.optional(z.number().max(16777215)),
  spoiler: z.optional(z.boolean()),
  components: z.array(containerChildSchema).min(1).max(10),
});

export type MessageComponentContainer = z.infer<typeof containerSchema>;

// Any top-level component, V1 (action row) or V2 (layout/content).
export const topLevelComponentSchema = z.union([
  actionRowSchema,
  containerSchema,
  textDisplaySchema,
  sectionSchema,
  mediaGallerySchema,
  separatorSchema,
  fileSchema,
]);

export type MessageComponent = z.infer<typeof topLevelComponentSchema>;

export const messageContentSchema = z.string().max(2000);

export type MessageContent = z.infer<typeof messageContentSchema>;

export const webhookUsernameSchema = z.optional(
  z
    .string()
    .max(80)
    .refine(
      (val) =>
        !val.toLowerCase().includes("clyde") &&
        !val.toLowerCase().includes("discord"),
      "Username can't contain 'clyde' or 'discord'"
    )
    .refine(
      (val) => val.toLowerCase() !== "everyone" && val.toLowerCase() !== "here",
      "Username can't be 'everyone'  or 'here'"
    )
);

export type WebhookUsername = z.infer<typeof webhookUsernameSchema>;

export const webhookAvatarUrlSchema = z.optional(
  z.string().refine(...imageUrlRefinement)
);

export type WebhookAvatarUrl = z.infer<typeof webhookAvatarUrlSchema>;

export const messageTtsSchema = z.boolean();

export type MessageTts = z.infer<typeof messageTtsSchema>;

export const messageAllowedMentionsSchema = z.optional(
  z.object({
    parse: z
      .array(
        z.literal("users").or(z.literal("roles")).or(z.literal("everyone"))
      )
      .optional(),
    roles: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    replied_user: z.boolean().optional(),
  })
);

export const messageThreadNameSchema = z.optional(z.string().max(100));

export const attachmentSchema = z.object({
  asset_id: z.string(),
});

export type MessageAttachment = z.infer<typeof attachmentSchema>;

export const messageSchema = z
  .object({
    content: messageContentSchema.default(""),
    flags: z.optional(z.number()).default(0),
    username: webhookUsernameSchema,
    avatar_url: webhookAvatarUrlSchema,
    tts: messageTtsSchema.default(false),
    attachments: z.array(attachmentSchema).max(10).default([]),
    embeds: z.array(embedSchema).max(10).default([]),
    allowed_mentions: messageAllowedMentionsSchema,
    components: z.array(topLevelComponentSchema).max(40).default([]),
    thread_name: messageThreadNameSchema,
  })
  .superRefine((data, ctx) => {
    const isV2 = ((data.flags ?? 0) & MESSAGE_FLAG_COMPONENTS_V2) !== 0;

    if (isV2) {
      // With Components V2 the content and embeds fields are not allowed;
      // everything has to be expressed through components.
      if (data.content) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "Content is not allowed when Components V2 is enabled",
        });
      }
      if (data.embeds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["embeds"],
          message: "Embeds are not allowed when Components V2 is enabled",
        });
      }
      if (!data.components.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["components"],
          message: "At least one component is required with Components V2",
        });
      }
    } else {
      // this currently doesn't take attachments into account
      if (!data.content && !data.embeds.length && !data.components.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "Content is required when no other fields are set",
        });
      }
    }
  });

export type Message = z.infer<typeof messageSchema>;

export function isComponentsV2(message: { flags?: number }): boolean {
  return ((message.flags ?? 0) & MESSAGE_FLAG_COMPONENTS_V2) !== 0;
}
