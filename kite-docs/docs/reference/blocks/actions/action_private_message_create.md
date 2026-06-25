---
sidebar_position: 13
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Gửi tin nhắn riêng

<EmbedFlowNode type="action_private_message_create" />

> Gửi tin nhắn riêng (DM) cho một người dùng.

## Khi nào dùng

- Gửi thông báo cá nhân, mã xác nhận, nhắc nhở.
- Phản hồi riêng tư ngoài kênh chung.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
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

- Sẽ thất bại nếu người dùng tắt nhận tin nhắn riêng từ thành viên server.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)

<NodeInfoExplorer type="action_private_message_create" />
