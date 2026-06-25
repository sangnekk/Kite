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

## Dữ liệu khả dụng

Khối này **không tạo `result()`**. Khi sự kiện kích hoạt, dùng dữ liệu qua các placeholder như `{{ user.mention }}`, `{{ message.content }}`, `{{ channel.id }}` trong [biểu thức](/reference/expressions).

Mỗi loại sự kiện cung cấp placeholder khác nhau, và nhiều loại hiện chưa cung cấp dữ liệu nào. Xem bảng đầy đủ tại [Dữ liệu của sự kiện](/reference/event#dữ-liệu-của-sự-kiện).

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Sự kiện](/reference/event)
- [Bộ lọc sự kiện](/reference/blocks/options/option_event_filter)
- [Lệnh](/reference/blocks/entries/entry_command)

<NodeInfoExplorer type="entry_event" />
