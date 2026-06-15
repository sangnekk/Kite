import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  MessageComponentButtonStyle,
  EmbedField,
  Message,
  MessageComponentActionRow,
  MessageComponentButton,
  MessageEmbed,
  MessageComponentSelectMenuOption,
  MessageComponentSelectMenu,
  Emoji,
  MessageAttachment,
  MessageComponentThumbnail,
  MessageComponentMediaGalleryItem,
  MESSAGE_FLAG_COMPONENTS_V2,
} from "./schema";
import { getUniqueId } from "@/lib/utils";
import { temporal } from "zundo";
import debounce from "just-debounce-it";

// ---------------------------------------------------------------------------
// Components V2 tree helpers
//
// V2 components are arbitrarily nested (container -> section -> text display).
// We address them by a `path` of indices that navigates into nested
// `components` arrays. These helpers use `any` because narrowing the deeply
// recursive union on every access is impractical; the runtime `type` checks in
// the mutations keep things safe.
// ---------------------------------------------------------------------------

function resolveChildArray(root: any[], parentPath: number[]): any[] | null {
  let arr: any[] = root;
  for (const idx of parentPath) {
    const node = arr?.[idx];
    if (!node || !Array.isArray(node.components)) return null;
    arr = node.components;
  }
  return arr ?? null;
}

function resolveNodeAtPath(root: any[], path: number[]): any | null {
  if (path.length === 0) return null;
  const parent = resolveChildArray(root, path.slice(0, -1));
  return parent?.[path[path.length - 1]] ?? null;
}

// regenerateComponentIds deep-clones a component subtree, assigning fresh ids
// and flow_source_ids so duplicated buttons don't share a flow.
function regenerateComponentIds(node: any): any {
  const clone = JSON.parse(JSON.stringify(node));
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if ("id" in n) n.id = getUniqueId();
    if ("flow_source_id" in n) n.flow_source_id = getUniqueId().toString();
    if (Array.isArray(n.components)) n.components.forEach(walk);
    if (n.accessory) walk(n.accessory);
    if (Array.isArray(n.items)) n.items.forEach(walk);
  };
  walk(clone);
  return clone;
}

export interface MessageStore extends Message {
  clear(): void;
  reset(): void;
  replace(message: Message): void;
  setContent: (content: string) => void;
  setUsername: (username: string | undefined) => void;
  setAvatarUrl: (avatar_url: string | undefined) => void;
  setThreadName: (thread_name: string | undefined) => void;
  addAttachment: (attachment: MessageAttachment) => void;
  clearAttachments: () => void;
  deleteAttachment: (i: number) => void;
  addEmbed: (embed: MessageEmbed) => void;
  clearEmbeds: () => void;
  moveEmbedDown: (i: number) => void;
  moveEmbedUp: (i: number) => void;
  duplicateEmbed: (i: number) => void;
  deleteEmbed: (i: number) => void;
  setEmbedDescription: (i: number, description: string | undefined) => void;
  setEmbedTitle: (i: number, title: string | undefined) => void;
  setEmbedUrl: (i: number, url: string | undefined) => void;
  setEmbedAuthorName: (i: number, name: string) => void;
  setEmbedAuthorUrl: (i: number, url: string | undefined) => void;
  setEmbedAuthorIconUrl: (i: number, icon_url: string | undefined) => void;
  setEmbedThumbnailUrl: (i: number, url: string | undefined) => void;
  setEmbedImageUrl: (i: number, url: string | undefined) => void;
  setEmbedFooterText: (i: number, text: string | undefined) => void;
  setEmbedFooterIconUrl: (i: number, icon_url: string | undefined) => void;
  setEmbedColor: (i: number, color: number | undefined) => void;
  setEmbedTimestamp: (i: number, timestamp: string | undefined) => void;
  addEmbedField: (i: number, field: EmbedField) => void;
  setEmbedFieldName: (i: number, j: number, name: string) => void;
  setEmbedFieldValue: (i: number, j: number, value: string) => void;
  setEmbedFieldInline: (
    i: number,
    j: number,
    inline: boolean | undefined
  ) => void;
  moveEmbedFieldDown: (i: number, j: number) => void;
  moveEmbedFieldUp: (i: number, j: number) => void;
  deleteEmbedField: (i: number, j: number) => void;
  duplicateEmbedField: (i: number, j: number) => void;
  clearEmbedFields: (i: number) => void;
  addComponentRow: (row: MessageComponentActionRow) => void;
  clearComponentRows: () => void;
  moveComponentRowUp: (i: number) => void;
  moveComponentRowDown: (i: number) => void;
  duplicateComponentRow: (i: number) => void;
  deleteComponentRow: (i: number) => void;
  addButton: (i: number, button: MessageComponentButton) => void;
  clearButtons: (i: number) => void;
  moveButtonDown: (i: number, j: number) => void;
  moveButtonUp: (i: number, j: number) => void;
  duplicateButton: (i: number, j: number) => void;
  deleteButton: (i: number, j: number) => void;
  setButtonStyle: (
    i: number,
    j: number,
    style: MessageComponentButtonStyle
  ) => void;
  setButtonLabel: (i: number, j: number, label: string) => void;
  setButtonEmoji: (i: number, j: number, emoji: Emoji | undefined) => void;
  setButtonUrl: (i: number, j: number, url: string) => void;
  setButtonDisabled: (
    i: number,
    j: number,
    disabled: boolean | undefined
  ) => void;
  setSelectMenuPlaceholder: (
    i: number,
    j: number,
    placeholder: string | undefined
  ) => void;
  setSelectMenuDisabled: (
    i: number,
    j: number,
    disabled: boolean | undefined
  ) => void;
  addSelectMenuOption: (
    i: number,
    j: number,
    option: MessageComponentSelectMenuOption
  ) => void;
  clearSelectMenuOptions: (i: number, j: number) => void;
  moveSelectMenuOptionDown: (i: number, j: number, k: number) => void;
  moveSelectMenuOptionUp: (i: number, j: number, k: number) => void;
  duplicateSelectMenuOption: (i: number, j: number, k: number) => void;
  deleteSelectMenuOption: (i: number, j: number, k: number) => void;
  setSelectMenuOptionLabel: (
    i: number,
    j: number,
    k: number,
    label: string
  ) => void;
  setSelectMenuOptionDescription: (
    i: number,
    j: number,
    k: number,
    description: string | undefined
  ) => void;
  setSelectMenuOptionEmoji: (
    i: number,
    j: number,
    k: number,
    emoji: Emoji | undefined
  ) => void;

  getSelectMenu: (i: number, j: number) => MessageComponentSelectMenu | null;
  getButton: (i: number, j: number) => MessageComponentButton | null;

  // Components V2
  setFlags: (flags: number) => void;
  setComponentsV2Enabled: (enabled: boolean) => void;
  addComponentAtPath: (parentPath: number[], component: any) => void;
  deleteComponentAtPath: (path: number[]) => void;
  moveComponentAtPath: (path: number[], dir: -1 | 1) => void;
  duplicateComponentAtPath: (path: number[]) => void;
  updateComponentAtPath: (path: number[], patch: Record<string, any>) => void;
  getComponentAtPath: (path: number[]) => any | null;
  setSectionAccessory: (
    path: number[],
    accessory: MessageComponentButton | MessageComponentThumbnail
  ) => void;
  addMediaGalleryItem: (
    path: number[],
    item: MessageComponentMediaGalleryItem
  ) => void;
  updateMediaGalleryItem: (
    path: number[],
    k: number,
    patch: Record<string, any>
  ) => void;
  deleteMediaGalleryItem: (path: number[], k: number) => void;
  moveMediaGalleryItem: (path: number[], k: number, dir: -1 | 1) => void;
}

export const emptyMessage: Message = {
  username: undefined,
  avatar_url: undefined,
  content: "",
  flags: 0,
  tts: false,
  attachments: [],
  embeds: [],
  components: [],
};

export const createMessageStore = (initial?: Message) => {
  const defaultMessage = initial || emptyMessage;

  return create<MessageStore>()(
    immer(
      temporal(
        (set, get) => ({
          ...defaultMessage,

          clear: () => set(emptyMessage),
          reset: () => set(defaultMessage),
          replace: (message: Message) => set(message),
          setContent: (content: string) => set({ content }),
          setUsername: (username: string | undefined) => set({ username }),
          setAvatarUrl: (avatar_url: string | undefined) => set({ avatar_url }),
          setThreadName: (thread_name: string | undefined) =>
            set({ thread_name }),
          addAttachment: (attachment: MessageAttachment) =>
            set((state) => {
              if (!state.attachments) {
                state.attachments = [attachment];
              } else {
                state.attachments.push(attachment);
              }
            }),
          clearAttachments: () => set({ attachments: [] }),
          deleteAttachment: (i: number) =>
            set((state) => {
              if (!state.attachments) {
                return;
              }
              state.attachments.splice(i, 1);
            }),
          addEmbed: (embed: MessageEmbed) =>
            set((state) => {
              if (!state.embeds) {
                state.embeds = [embed];
              } else {
                state.embeds.push(embed);
              }
            }),
          clearEmbeds: () => set({ embeds: [] }),
          moveEmbedDown: (i: number) => {
            set((state) => {
              if (!state.embeds) {
                return;
              }
              const embed = state.embeds[i];
              if (!embed) {
                return;
              }
              state.embeds.splice(i, 1);
              state.embeds.splice(i + 1, 0, embed);
            });
          },
          moveEmbedUp: (i: number) => {
            set((state) => {
              if (!state.embeds) {
                return;
              }
              const embed = state.embeds[i];
              if (!embed) {
                return;
              }
              state.embeds.splice(i, 1);
              state.embeds.splice(i - 1, 0, embed);
            });
          },
          duplicateEmbed: (i: number) => {
            set((state) => {
              if (!state.embeds) {
                return;
              }
              const embed = state.embeds[i];
              if (!embed) {
                return;
              }
              state.embeds.splice(i + 1, 0, { ...embed, id: getUniqueId() });
            });
          },
          deleteEmbed: (i: number) => {
            set((state) => {
              if (!state.embeds) {
                return;
              }
              state.embeds.splice(i, 1);
            });
          },
          setEmbedDescription: (i: number, description: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].description = description;
              }
            });
          },
          setEmbedTitle: (i: number, title: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].title = title;
              }
            });
          },
          setEmbedUrl: (i: number, url: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].url = url;
              }
            });
          },
          setEmbedAuthorName: (i: number, name: string) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!name) {
                if (!embed.author) {
                  return;
                }

                embed.author.name = name;
                if (!embed.author.icon_url && !embed.author.url) {
                  embed.author = undefined;
                }
              } else {
                if (!embed.author) {
                  embed.author = { name };
                } else {
                  embed.author.name = name;
                }
              }
            }),
          setEmbedAuthorUrl: (i: number, url: string | undefined) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!url) {
                if (!embed.author) {
                  return;
                }
                embed.author.url = undefined;

                if (!embed.author.name && !embed.author.icon_url) {
                  embed.author = undefined;
                }
              } else {
                if (!embed.author) {
                  embed.author = { url, name: "" };
                } else {
                  embed.author.url = url;
                }
              }
            }),
          setEmbedAuthorIconUrl: (i: number, icon_url: string | undefined) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!icon_url) {
                if (!embed.author) {
                  return;
                }
                embed.author.icon_url = undefined;

                if (!embed.author.name && !embed.author.url) {
                  embed.author = undefined;
                }
              } else {
                if (!embed.author) {
                  embed.author = { icon_url, name: "" };
                } else {
                  embed.author.icon_url = icon_url;
                }
              }
            }),
          setEmbedThumbnailUrl: (i: number, url: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].thumbnail = url ? { url } : undefined;
              }
            });
          },
          setEmbedImageUrl: (i: number, url: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].image = url ? { url } : undefined;
              }
            });
          },
          setEmbedFooterText: (i: number, text: string | undefined) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!text) {
                if (!embed.footer) {
                  return;
                }
                embed.footer.text = undefined;

                if (!embed.footer.icon_url) {
                  embed.footer = undefined;
                }
              } else {
                if (!embed.footer) {
                  embed.footer = { text };
                } else {
                  embed.footer.text = text;
                }
              }
            });
          },
          setEmbedFooterIconUrl: (i: number, icon_url: string | undefined) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!icon_url) {
                if (!embed.footer) {
                  return;
                }
                embed.footer.icon_url = undefined;

                if (!embed.footer.text) {
                  embed.footer = undefined;
                }
              } else {
                if (!embed.footer) {
                  embed.footer = { icon_url };
                } else {
                  embed.footer.icon_url = icon_url;
                }
              }
            });
          },
          setEmbedColor: (i: number, color: number | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].color = color;
              }
            });
          },
          setEmbedTimestamp: (i: number, timestamp: string | undefined) => {
            set((state) => {
              if (state.embeds && state.embeds[i]) {
                state.embeds[i].timestamp = timestamp;
              }
            });
          },
          addEmbedField: (i: number, field: EmbedField) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              if (!embed.fields) {
                embed.fields = [field];
              } else {
                embed.fields.push(field);
              }
            }),
          setEmbedFieldName: (i: number, j: number, name: string) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              field.name = name;
            }),
          setEmbedFieldValue: (i: number, j: number, value: string) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              field.value = value;
            }),
          setEmbedFieldInline: (
            i: number,
            j: number,
            inline: boolean | undefined
          ) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              field.inline = inline;
            }),
          deleteEmbedField: (i: number, j: number) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              embed.fields && embed.fields.splice(j, 1);
            });
          },
          moveEmbedFieldDown: (i: number, j: number) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              embed.fields && embed.fields.splice(j, 1);
              embed.fields && embed.fields.splice(j + 1, 0, field);
            });
          },
          moveEmbedFieldUp: (i: number, j: number) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              embed.fields && embed.fields.splice(j, 1);
              embed.fields && embed.fields.splice(j - 1, 0, field);
            });
          },
          duplicateEmbedField: (i: number, j: number) => {
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              const field = embed.fields && embed.fields[j];
              if (!field) {
                return;
              }
              embed.fields &&
                embed.fields.splice(j + 1, 0, {
                  ...field,
                  id: getUniqueId(),
                });
            });
          },
          clearEmbedFields: (i: number) =>
            set((state) => {
              const embed = state.embeds && state.embeds[i];
              if (!embed) {
                return;
              }
              embed.fields = [];
            }),
          addComponentRow: (row: MessageComponentActionRow) =>
            set((state) => {
              if (!state.components) {
                state.components = [row];
              } else {
                state.components.push(row);
              }
            }),
          clearComponentRows: () =>
            set((state) => {
              state.components = [];
            }),
          moveComponentRowUp: (i: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              state.components.splice(i, 1);
              state.components.splice(i - 1, 0, row);
            }),
          moveComponentRowDown: (i: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              state.components.splice(i, 1);
              state.components.splice(i + 1, 0, row);
            }),
          duplicateComponentRow: (i: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }

              // This is a bit complex because we can't allow duplicated action set ids
              const newRow: MessageComponentActionRow = {
                id: getUniqueId(),
                type: 1,
                components: row.components.map((comp) => {
                  const flowSourceId = getUniqueId().toString();
                  return { ...comp, flow_source_id: flowSourceId };
                }),
              };

              // TODO: change action set ids
              state.components.splice(i + 1, 0, newRow);
            }),
          deleteComponentRow: (i: number) =>
            set((state) => {
              state.components.splice(i, 1);
            }),
          addButton: (i: number, button: MessageComponentButton) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }

              if (!row.components) {
                row.components = [button];
              } else {
                row.components.push(button);
              }
            }),
          clearButtons: (i: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }

              row.components = [];
            }),
          deleteButton: (i: number, j: number) =>
            set((state) => {
              const row = state.components[i];
              if (!row || row.type !== 1) {
                return;
              }

              row.components.splice(j, 1);
            }),
          moveButtonUp: (i: number, j: number) =>
            set((state) => {
              const row = state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components[j];
              if (!button) {
                return;
              }
              row.components.splice(j, 1);
              row.components.splice(j - 1, 0, button);
            }),
          moveButtonDown: (i: number, j: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components[j];
              if (!button) {
                return;
              }
              row.components.splice(j, 1);
              row.components.splice(j + 1, 0, button);
            }),
          duplicateButton: (i: number, j: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button || button.type !== 2) {
                return;
              }

              const actionId = getUniqueId().toString();

              row.components.splice(j + 1, 0, {
                ...button,
                id: getUniqueId(),
                flow_source_id: actionId,
              });
            }),
          setButtonStyle: (
            i: number,
            j: number,
            style: MessageComponentButtonStyle
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button || button.type !== 2) {
                return;
              }

              button.style = style;
              if (button.style === 5) {
                button.url = "";
              }
            }),
          setButtonLabel: (i: number, j: number, label: string) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button || button.type !== 2) {
                return;
              }
              button.label = label;
            }),
          setButtonEmoji: (i: number, j: number, emoji: Emoji | undefined) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button || button.type !== 2) {
                return;
              }
              button.emoji = emoji;
            }),
          setButtonUrl: (i: number, j: number, url: string) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button || button.type !== 2 || button.style !== 5) {
                return;
              }
              button.url = url;
            }),
          setButtonDisabled: (
            i: number,
            j: number,
            disabled: boolean | undefined
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const button = row.components && row.components[j];
              if (!button) {
                return;
              }
              button.disabled = disabled;
            }),
          setSelectMenuPlaceholder: (
            i: number,
            j: number,
            placeholder: string | undefined
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              selectMenu.placeholder = placeholder;
            }),
          setSelectMenuDisabled: (
            i: number,
            j: number,
            disabled: boolean | undefined
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              selectMenu.disabled = disabled;
            }),
          addSelectMenuOption: (
            i: number,
            j: number,
            option: MessageComponentSelectMenuOption
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }

              if (!selectMenu.options) {
                selectMenu.options = [option];
              } else {
                selectMenu.options.push(option);
              }
            }),
          clearSelectMenuOptions: (i: number, j: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }

              selectMenu.options = [];
            }),
          moveSelectMenuOptionDown: (i: number, j: number, k: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options[k];
              if (!option) {
                return;
              }
              selectMenu.options.splice(k, 1);
              selectMenu.options.splice(k + 1, 0, option);
            }),
          moveSelectMenuOptionUp: (i: number, j: number, k: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options[k];
              if (!option) {
                return;
              }
              selectMenu.options.splice(k, 1);
              selectMenu.options.splice(k - 1, 0, option);
            }),
          duplicateSelectMenuOption: (i: number, j: number, k: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options[k];
              if (!option) {
                return;
              }

              selectMenu.options.splice(k + 1, 0, {
                ...option,
                id: getUniqueId(),
              });
            }),
          deleteSelectMenuOption: (i: number, j: number, k: number) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }

              selectMenu.options.splice(k, 1);
            }),
          setSelectMenuOptionLabel: (
            i: number,
            j: number,
            k: number,
            label: string
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options && selectMenu.options[k];
              if (!option) {
                return;
              }
              option.label = label;
            }),
          setSelectMenuOptionDescription: (
            i: number,
            j: number,
            k: number,
            description: string | undefined
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options && selectMenu.options[k];
              if (!option) {
                return;
              }
              option.description = description;
            }),
          setSelectMenuOptionEmoji: (
            i: number,
            j: number,
            k: number,
            emoji: Emoji | undefined
          ) =>
            set((state) => {
              const row = state.components && state.components[i];
              if (!row || row.type !== 1) {
                return;
              }
              const selectMenu = row.components && row.components[j];
              if (!selectMenu || selectMenu.type !== 3) {
                return;
              }
              const option = selectMenu.options && selectMenu.options[k];
              if (!option) {
                return;
              }
              option.emoji = emoji;
            }),

          getSelectMenu: (i: number, j: number) => {
            const state = get();
            const row = state.components && state.components[i];
            if (!row || row.type !== 1) {
              return null;
            }

            const selectMenu = row.components && row.components[j];
            if (selectMenu && selectMenu.type === 3) {
              return selectMenu;
            }
            return null;
          },
          getButton: (i: number, j: number) => {
            const state = get();
            const row = state.components && state.components[i];
            if (!row || row.type !== 1) {
              return null;
            }

            const button = row.components && row.components[j];
            if (button && button.type === 2) {
              return button;
            }
            return null;
          },

          // ---- Components V2 ----
          setFlags: (flags: number) => set({ flags }),
          setComponentsV2Enabled: (enabled: boolean) =>
            set((state) => {
              const cur = state.flags ?? 0;
              if (enabled) {
                state.flags = cur | MESSAGE_FLAG_COMPONENTS_V2;
                // Components V2 disallows content and embeds.
                state.content = "";
                state.embeds = [];
              } else {
                state.flags = cur & ~MESSAGE_FLAG_COMPONENTS_V2;
              }
              // The component shapes are incompatible between V1 and V2, so we
              // start fresh when switching modes.
              state.components = [];
            }),
          addComponentAtPath: (parentPath: number[], component: any) =>
            set((state) => {
              const arr = resolveChildArray(state.components as any[], parentPath);
              if (!arr) return;
              arr.push(component as any);
            }),
          deleteComponentAtPath: (path: number[]) =>
            set((state) => {
              if (path.length === 0) return;
              const parent = resolveChildArray(
                state.components as any[],
                path.slice(0, -1)
              );
              if (!parent) return;
              parent.splice(path[path.length - 1], 1);
            }),
          moveComponentAtPath: (path: number[], dir: -1 | 1) =>
            set((state) => {
              if (path.length === 0) return;
              const parent = resolveChildArray(
                state.components as any[],
                path.slice(0, -1)
              );
              if (!parent) return;
              const i = path[path.length - 1];
              const j = i + dir;
              if (j < 0 || j >= parent.length) return;
              const [node] = parent.splice(i, 1);
              parent.splice(j, 0, node);
            }),
          duplicateComponentAtPath: (path: number[]) =>
            set((state) => {
              if (path.length === 0) return;
              const parent = resolveChildArray(
                state.components as any[],
                path.slice(0, -1)
              );
              if (!parent) return;
              const i = path[path.length - 1];
              const node = parent[i];
              if (!node) return;
              parent.splice(i + 1, 0, regenerateComponentIds(node));
            }),
          updateComponentAtPath: (path: number[], patch: Record<string, any>) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node) return;
              Object.assign(node, patch);
            }),
          getComponentAtPath: (path: number[]) =>
            resolveNodeAtPath(get().components as any[], path),
          setSectionAccessory: (
            path: number[],
            accessory: MessageComponentButton | MessageComponentThumbnail
          ) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node || node.type !== 9) return;
              node.accessory = accessory as any;
            }),
          addMediaGalleryItem: (
            path: number[],
            item: MessageComponentMediaGalleryItem
          ) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node || node.type !== 12) return;
              if (!node.items) node.items = [];
              node.items.push(item as any);
            }),
          updateMediaGalleryItem: (
            path: number[],
            k: number,
            patch: Record<string, any>
          ) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node || node.type !== 12) return;
              const it = node.items?.[k];
              if (!it) return;
              Object.assign(it, patch);
            }),
          deleteMediaGalleryItem: (path: number[], k: number) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node || node.type !== 12) return;
              node.items?.splice(k, 1);
            }),
          moveMediaGalleryItem: (path: number[], k: number, dir: -1 | 1) =>
            set((state) => {
              const node = resolveNodeAtPath(state.components as any[], path);
              if (!node || node.type !== 12 || !node.items) return;
              const j = k + dir;
              if (j < 0 || j >= node.items.length) return;
              const [it] = node.items.splice(k, 1);
              node.items.splice(j, 0, it);
            }),
        }),
        {
          limit: 10,
          handleSet: (handleSet) => debounce(handleSet, 1000, true),
        }
      )
    )
  );
};
