---
slug: /reference/blocks/actions/action_message_edit
sidebar_position: 10
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Chỉnh sửa tin nhắn kênh

<EmbedFlowNode type="action_message_edit" />

> Chỉnh sửa nội dung một tin nhắn đã có trong kênh.

## Khi nào dùng

- Cập nhật bảng điểm/trạng thái mà không gửi tin mới.
- Sửa tin nhắn do bot gửi trước đó.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Tin nhắn` — ID tin nhắn cần thao tác.
>
> `Nội dung tin nhắn` — soạn trực tiếp trong khối hoặc chọn một [mẫu tin nhắn](/reference/message). Hỗ trợ embed, tệp đính kèm và nút bấm.

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

- Cần ID tin nhắn — thường lấy từ `result('id').id` của khối [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create).
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)
- [Lấy tin nhắn kênh](/reference/blocks/actions/action_message_get)

<NodeInfoExplorer type="action_message_edit" />
