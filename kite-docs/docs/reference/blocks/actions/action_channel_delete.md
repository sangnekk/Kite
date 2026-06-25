---
sidebar_position: 26
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xóa kênh

<EmbedFlowNode type="action_channel_delete" />

> Xóa một kênh hoặc luồng.

## Khi nào dùng

- Đóng kênh ticket/tạm khi xong việc.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo kênh](/reference/blocks/actions/action_channel_create)

<NodeInfoExplorer type="action_channel_delete" />
