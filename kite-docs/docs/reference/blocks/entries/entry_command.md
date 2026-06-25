---
sidebar_position: 1
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lệnh

<EmbedFlowNode type="entry_command" />

> Điểm bắt đầu của một slash command — flow chạy khi người dùng gõ lệnh.

## Khi nào dùng

- Tạo một lệnh `/` để người dùng gọi.
- Là khối gốc của mọi flow lệnh; thả các khối hành động và [tùy chọn lệnh](/reference/blocks/options/option_command_argument) vào bên dưới.

## Cấu hình

> `Tên` — tên lệnh người dùng gõ sau dấu `/`. Thêm khoảng trắng để tạo lệnh con.
>
> `Mô tả` — mô tả ngắn hiển thị trong Discord.
>
> `Loại lệnh` — slash command hay menu chuột phải.

## Ví dụ

1. Thêm khối **Lệnh**, đặt tên `ping`.
2. Nối tới [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create) với nội dung `Pong! 🏓`.
3. Lưu — sau khoảng 60 giây, gõ `/ping` trong Discord.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create)
- [Đối số lệnh](/reference/blocks/options/option_command_argument)
- [Lệnh tùy chỉnh](/reference/command)

<NodeInfoExplorer type="entry_command" />
