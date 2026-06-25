---
sidebar_position: 27
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lấy server

<EmbedFlowNode type="action_guild_get" />

> Đọc thông tin server (guild) theo ID.

## Khi nào dùng

- Lấy tên/biểu tượng server để hiển thị trong tin nhắn.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').id` | ID server |
| `result('id').name` | Tên server |
| `result('id').icon_url` | URL biểu tượng server |

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy kênh](/reference/blocks/actions/action_channel_get)

<NodeInfoExplorer type="action_guild_get" />
