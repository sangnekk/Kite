---
sidebar_position: 2
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lắng nghe sự kiện

<EmbedFlowNode type="entry_event" />

> Điểm bắt đầu của flow được kích hoạt tự động bởi một sự kiện trong server.

## Khi nào dùng

- Tự động phản hồi khi có tin nhắn mới, thành viên vào/rời, reaction...
- Là khối gốc của mọi flow sự kiện.

## Cấu hình

> `Loại sự kiện` — sự kiện cần lắng nghe (Message Create, Member Join...). Xem [Sự kiện](/reference/event).
>
> `Mô tả` — ghi chú nội bộ cho bộ lắng nghe.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Sự kiện](/reference/event)
- [Bộ lọc sự kiện](/reference/blocks/options/option_event_filter)
- [Lệnh](/reference/blocks/entries/entry_command)

<NodeInfoExplorer type="entry_event" />
