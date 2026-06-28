---
slug: /reference/blocks/actions/action_message_reaction_create
sidebar_position: 14
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tạo reaction tin nhắn

<EmbedFlowNode type="action_message_reaction_create" />

> Thả một biểu tượng cảm xúc (reaction) vào tin nhắn.

## Khi nào dùng

- Đánh dấu tin nhắn đã xử lý.
- Tạo nút bình chọn bằng reaction.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Tin nhắn` — ID tin nhắn cần thao tác.
>
> `Biểu tượng cảm xúc` — emoji cần thả hoặc gỡ.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Gỡ cảm xúc](/reference/blocks/actions/action_message_reaction_delete)

<NodeInfoExplorer type="action_message_reaction_create" />
