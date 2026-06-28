---
slug: /reference/blocks/actions/action_message_reaction_delete
sidebar_position: 15
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Xóa reaction tin nhắn

<EmbedFlowNode type="action_message_reaction_delete" />

> Gỡ một reaction khỏi tin nhắn.

## Khi nào dùng

- Xoá reaction sau khi xử lý.
- Reset bình chọn bằng reaction.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Tin nhắn` — ID tin nhắn cần thao tác.
>
> `Biểu tượng cảm xúc` — emoji cần thả hoặc gỡ.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Thả cảm xúc](/reference/blocks/actions/action_message_reaction_create)

<NodeInfoExplorer type="action_message_reaction_delete" />
