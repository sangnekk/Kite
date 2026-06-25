---
sidebar_position: 11
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xóa tin nhắn kênh

<EmbedFlowNode type="action_message_delete" />

> Xóa một tin nhắn khỏi kênh.

## Khi nào dùng

- Dọn tin nhắn tạm hoặc nội dung vi phạm.
- Xóa tin do bot gửi sau một khoảng thời gian.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Tin nhắn` — ID tin nhắn cần thao tác.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)
- [Khối điều khiển luồng](/reference/blocks/#khối-điều-khiển-luồng)

<NodeInfoExplorer type="action_message_delete" />
