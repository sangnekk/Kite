---
sidebar_position: 2
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lắng nghe sự kiện

<EmbedFlowNode type="entry_event" />

> Điểm bắt đầu của flow được kích hoạt tự động bởi một sự kiện trong server.

## Khi nào dùng

- Tự động phản hồi khi có tin nhắn mới, thành viên vào/rời, reaction... (Discord)
- Xử lý sự kiện thanh toán từ SePay, ThueAPIBank, hoặc webhook tùy chỉnh
- Là khối gốc của mọi flow sự kiện.

## Cấu hình

> `Nguồn` — nguồn sự kiện: `Discord`, `SePay`, `ThueAPIBank`, hoặc `Webhook tùy chỉnh`
>
> `Loại sự kiện` — loại sự kiện Discord cụ thể (Message Create, Member Join...). Chỉ xuất hiện khi nguồn là Discord. Xem [Sự kiện](/reference/event).
>
> `Mô tả` — ghi chú nội bộ cho bộ lắng nghe.

## Dữ liệu khả dụng

Khối này **không tạo `result()`**. Khi sự kiện kích hoạt, dữ liệu truy cập qua [biểu thức](/reference/expressions):

- **Discord:** `{{ user.mention }}`, `{{ message.content }}`, `{{ channel.id }}`... Xem bảng đầy đủ tại [Dữ liệu của sự kiện](/reference/event#sự-kiện-discord).
- **Webhook (SePay, ThueAPIBank, Custom):** `{{ event.data.{field} }}` — toàn bộ JSON payload từ dịch vụ bên ngoài. Xem [Tích hợp Webhook](/reference/integration#dữ-liệu-của-sự-kiện-webhook).

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- Webhook sources yêu cầu bật tích hợp tương ứng tại trang **Tích hợp** trước.
- [Sự kiện](/reference/event)
- [Tích hợp Webhook](/reference/integration)
- [Bộ lọc sự kiện](/reference/blocks/options/option_event_filter)
- [Lệnh](/reference/blocks/entries/entry_command)

<NodeInfoExplorer type="entry_event" />
