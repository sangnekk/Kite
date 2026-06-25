---
sidebar_position: 5
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chỉnh sửa tin nhắn phản hồi

<EmbedFlowNode type="action_response_edit" />

> Chỉnh sửa nội dung của một phản hồi đã gửi.

## Khi nào dùng

- Cập nhật phản hồi sau khi xử lý xong (vd sau khi gọi API hoặc hỏi AI).
- Đổi nội dung khi người dùng bấm nút.

## Cấu hình

> `Phản hồi` — phản hồi cần thao tác (thường là phản hồi đã tạo trước đó).
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

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create)
- [Trì hoãn phản hồi](/reference/blocks/actions/action_response_defer)

<NodeInfoExplorer type="action_response_edit" />
