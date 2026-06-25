---
sidebar_position: 12
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lấy tin nhắn kênh

<EmbedFlowNode type="action_message_get" />

> Đọc thông tin một tin nhắn theo ID.

## Khi nào dùng

- Lấy nội dung/tác giả của một tin nhắn để xử lý tiếp.
- Kiểm tra tin nhắn trước khi sửa hoặc xóa.

## Cấu hình

> `Tin nhắn` — ID tin nhắn cần thao tác.

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').id` | ID của tin nhắn |
| `result('id').channel_id` | ID kênh chứa tin nhắn |
| `result('id').content` | Nội dung tin nhắn |
| `result('id').author` | Người gửi (khi là tin nhắn riêng) |
| `result('id').member` | Người gửi (khi trong server) |

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Sửa tin nhắn kênh](/reference/blocks/actions/action_message_edit)
- [Xóa tin nhắn kênh](/reference/blocks/actions/action_message_delete)

<NodeInfoExplorer type="action_message_get" />
