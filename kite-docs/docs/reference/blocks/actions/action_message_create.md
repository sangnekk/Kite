---
sidebar_position: 9
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo tin nhắn kênh

<EmbedFlowNode type="action_message_create" />

> Gửi một tin nhắn mới vào một kênh bất kỳ — kèm embed, tệp đính kèm và nút bấm nếu muốn.

## Khi nào dùng

- Gửi thông báo, tin chào mừng, hoặc ghi log vào một kênh cố định.
- Đăng tin nhắn có **nút bấm** để người dùng tương tác (tạo [sub-flow](/reference/sub-flows)).
- Gửi lại một [mẫu tin nhắn](/reference/message) vào nhiều kênh.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
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

## Ví dụ

Chào mừng thành viên mới:
1. [Lắng nghe sự kiện](/reference/blocks/entries/entry_event) → **Member Join**.
2. **Tạo tin nhắn kênh** vào `#welcome`, nội dung `Chào mừng {{ user.mention }}! 🎉`.

## Lưu ý & liên quan

- Nếu tin nhắn chứa **nút bấm**, flow tạm dừng đến khi người dùng bấm — xem [Sub-flow](/reference/sub-flows).
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create)
- [Sửa tin nhắn kênh](/reference/blocks/actions/action_message_edit)
- [Gửi tin nhắn riêng](/reference/blocks/actions/action_private_message_create)

<NodeInfoExplorer type="action_message_create" />
