import { create, useStore } from "zustand";
import { persist } from "zustand/middleware";
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
} from "../schema/message";
import { getUniqueId } from "@/lib/utils";
import { TemporalState, temporal } from "zundo";
import debounce from "just-debounce-it";

export interface MessageStore extends Message {
  clear(): void;
  reset(): void;
  replace(message: Message): void;
  setContent: (content: string) => void;
  setUsername: (username: string | undefined) => void;
  setAvatarUrl: (avatar_url: string | undefined) => void;
  setThreadName: (thread_name: string | undefined) => void;
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
}

export const defaultMessage: Message = {
  username: undefined,
  avatar_url: undefined,
  content:
    'Chào mừng đến với **Embed Generator**! 🎉 Tạo tin nhắn embed tuyệt đẹp cho server Discord của bạn một cách dễ dàng!\n\nNếu bạn đã sẵn sàng, chỉ cần nhấn nút "Xóa" ở đầu trình soạn thảo và tạo tin nhắn của riêng bạn.\n\nNếu bạn cần hỗ trợ hoặc có câu hỏi, hãy tham gia [server hỗ trợ](/discord) của chúng tôi để kết nối với cộng đồng và nhận được sự giúp đỡ bạn cần.\n\nChúng tôi cũng có một [bot bổ sung](/invite) giúp nâng cao trải nghiệm với Embed Generator. Hãy xem [bot Discord](/invite) của chúng tôi với các tính năng như định dạng mention, kênh, emoji, tạo reaction role, thành phần tương tác, và hơn thế nữa.\n\nHãy để sáng tạo của bạn tỏa sáng và làm cho server của bạn nổi bật với Embed Generator! ✨',
  tts: false,
  embeds: [
    {
      id: 652627557,
      title: "Về Embed Generator",
      description:
        "Embed Generator là công cụ mạnh mẽ cho phép bạn tạo tin nhắn embed hấp dẫn và tương tác cho server Discord. Với webhook, Embed Generator cho phép bạn tùy chỉnh giao diện tin nhắn và làm chúng hấp dẫn hơn.\n\nĐể bắt đầu, bạn chỉ cần URL webhook, có thể lấy từ tab 'Tích hợp' trong cài đặt server. Nếu gặp vấn đề khi tạo webhook, bot của chúng tôi có thể hỗ trợ bạn.\n\nThay vì dùng webhook, bạn cũng có thể chọn server và kênh trực tiếp trên trang web. Bot sẽ tự động tạo webhook và sử dụng nó để gửi tin nhắn.",
      color: 2326507,
      fields: [],
    },
    {
      id: 10674342,
      title: "Tích hợp Bot Discord",
      description:
        "Embed Generator cung cấp tích hợp bot Discord giúp nâng cao chức năng. Mặc dù không bắt buộc để gửi tin nhắn, việc có bot trên server giúp bạn truy cập nhiều tính năng hơn!\n\nDưới đây là một số tính năng chính của bot:",
      color: 2326507,
      fields: [
        {
          id: 472281785,
          name: "Thành phần tương tác",
          value:
            "Với bot trên server, bạn có thể thêm các thành phần tương tác như nút bấm và menu chọn vào tin nhắn. Chỉ cần mời bot vào server, chọn đúng server trên trang web và bạn đã sẵn sàng!",
        },
        {
          id: 608893643,
          name: "Định dạng đặc biệt cho Mention, Kênh và Emoji",
          value:
            "Với lệnh /format, bot cung cấp tùy chọn định dạng đặc biệt cho mention, tag kênh và emoji sẵn dùng. Không cần lo lỗi định dạng thủ công! Chỉ cần sao chép và dán văn bản đã định dạng vào trình soạn thảo.",
        },
        {
          id: 724530251,
          name: "Khôi phục tin nhắn Embed Generator",
          value:
            "Nếu bạn cần lấy lại tin nhắn đã gửi trước đó bằng Embed Generator, bot có thể hỗ trợ. Nhấn chuột phải hoặc nhấn giữ bất kỳ tin nhắn nào trong server, chọn menu ứng dụng và chọn Khôi phục về Embed Generator. Bạn sẽ nhận được liên kết dẫn đến trang soạn thảo với tin nhắn đã chọn.",
        },
        {
          id: 927221233,
          name: "Tính năng bổ sung",
          value:
            "Bot cũng hỗ trợ lấy hình ảnh từ ảnh đại diện hoặc emoji, quản lý webhook, và hơn thế nữa. Mời bot vào server và dùng lệnh /help để khám phá tất cả tính năng có sẵn!",
        },
      ],
    },
  ],
  components: [],
};

export const emptyMessage: Message = {
  username: undefined,
  avatar_url: undefined,
  content: "",
  tts: false,
  embeds: [],
  components: [],
};

export const createMessageStore = (key: string) =>
  create<MessageStore>()(
    immer(
      persist(
        temporal(
          (set, get) => ({
            ...defaultMessage,

            clear: () => set(emptyMessage),
            reset: () => set(defaultMessage),
            replace: (message: Message) => set(message),
            setContent: (content: string) => set({ content }),
            setUsername: (username: string | undefined) => set({ username }),
            setAvatarUrl: (avatar_url: string | undefined) =>
              set({ avatar_url }),
            setThreadName: (thread_name: string | undefined) =>
              set({ thread_name }),
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
            setEmbedDescription: (
              i: number,
              description: string | undefined
            ) => {
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
            setEmbedFooterIconUrl: (
              i: number,
              icon_url: string | undefined
            ) => {
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
                if (!row) {
                  return;
                }
                state.components.splice(i, 1);
                state.components.splice(i - 1, 0, row);
              }),
            moveComponentRowDown: (i: number) =>
              set((state) => {
                const row = state.components && state.components[i];
                if (!row) {
                  return;
                }
                state.components.splice(i, 1);
                state.components.splice(i + 1, 0, row);
              }),
            duplicateComponentRow: (i: number) =>
              set((state) => {
                const row = state.components && state.components[i];
                if (!row) {
                  return;
                }

                // This is a bit complex because we can't allow duplicated action set ids
                const newRow: MessageComponentActionRow = {
                  id: getUniqueId(),
                  type: 1,
                  components: row.components.map((comp) => {
                    if (comp.type === 2) {
                      const actionId = getUniqueId().toString();
                      return { ...comp, action_set_id: actionId };
                    } else {
                      return {
                        ...comp,
                        options: comp.options.map((option) => {
                          const actionId = getUniqueId().toString();
                          return {
                            ...option,
                            action_set_id: actionId,
                          };
                        }),
                      };
                    }
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
                if (!row) {
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
                if (!row) {
                  return;
                }

                row.components = [];
              }),
            deleteButton: (i: number, j: number) =>
              set((state) => {
                const row = state.components[i];
                if (!row) {
                  return;
                }

                row.components.splice(j, 1);
              }),
            moveButtonUp: (i: number, j: number) =>
              set((state) => {
                const row = state.components[i];
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                  action_set_id: actionId,
                });
              }),
            setButtonStyle: (
              i: number,
              j: number,
              style: MessageComponentButtonStyle
            ) =>
              set((state) => {
                const row = state.components && state.components[i];
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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

                const actionId = getUniqueId().toString();
                selectMenu.options.splice(k + 1, 0, {
                  ...option,
                  id: getUniqueId(),
                  action_set_id: actionId,
                });
              }),
            deleteSelectMenuOption: (i: number, j: number, k: number) =>
              set((state) => {
                const row = state.components && state.components[i];
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
                if (!row) {
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
              if (!row) {
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
              if (!row) {
                return null;
              }

              const button = row.components && row.components[j];
              if (button && button.type === 2) {
                return button;
              }
              return null;
            },
          }),
          {
            limit: 10,
            handleSet: (handleSet) => debounce(handleSet, 1000, true),
          }
        ),
        { name: key, version: 0 }
      )
    )
  );

export const useCurrentMessageStore = createMessageStore(
  "message-creator-message"
);

export const useCurrentMessageUndoStore = <T>(
  selector: (state: TemporalState<MessageStore>) => T
) => useStore(useCurrentMessageStore.temporal, selector);
