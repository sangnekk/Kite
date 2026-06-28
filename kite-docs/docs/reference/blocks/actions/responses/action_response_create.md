---
slug: /reference/blocks/actions/action_response_create
sidebar_position: 4
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tạo tin nhắn phản hồi

<EmbedFlowNode type="action_response_create" />

> Trả lời trực tiếp lệnh hoặc tương tác mà người dùng vừa thực hiện.

## Khi nào dùng

- Phản hồi một slash command.
- Trả lời sau khi người dùng bấm nút hoặc gửi modal.
- Gửi phản hồi riêng tư (ephemeral) chỉ người gọi thấy.

## Cấu hình

> `Nội dung tin nhắn` — soạn trực tiếp trong khối hoặc chọn một [mẫu tin nhắn](/reference/message). Hỗ trợ embed, tệp đính kèm và nút bấm.
>
> `Chỉ mình tôi thấy` — nếu bật, chỉ người gọi lệnh nhìn thấy phản hồi (ephemeral).

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

Lệnh `/hello`:
1. [Lệnh](/reference/blocks/entries/entry_command) tên `hello`.
2. **Tạo tin nhắn phản hồi**, nội dung `Xin chào {{ user.mention }}!`.
3. Bật `Chỉ mình tôi thấy` nếu chỉ muốn người gọi nhìn thấy.

## Lưu ý & liên quan

- Mỗi tương tác chỉ tạo **một** phản hồi đầu tiên; những lần sau hãy dùng [Sửa tin nhắn phản hồi](/reference/blocks/actions/action_response_edit).
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Sửa tin nhắn phản hồi](/reference/blocks/actions/action_response_edit)
- [Trì hoãn phản hồi](/reference/blocks/actions/action_response_defer)
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)

<NodeInfoExplorer type="action_response_create" />
