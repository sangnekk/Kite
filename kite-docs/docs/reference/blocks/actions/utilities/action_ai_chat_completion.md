---
slug: /reference/blocks/actions/action_ai_chat_completion
sidebar_position: 31
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Hỏi AI

<EmbedFlowNode type="action_ai_chat_completion" />

> Gửi câu hỏi/prompt cho mô hình AI và nhận lại văn bản trả lời.

## Khi nào dùng

- Tạo trợ lý hỏi đáp, tóm tắt, dịch, viết nội dung.
- Phân tích hoặc biến đổi văn bản tự do.

## Cấu hình

> `Mô hình` — chọn mô hình AI; chi phí credit khác nhau theo mô hình.
>
> `Prompt` — câu hỏi hoặc yêu cầu gửi cho AI. Hỗ trợ [biểu thức](/reference/expressions).

## Kết quả trả về

Đặt một `id` cho khối rồi dùng `result('id')` để lấy văn bản AI trả về cho các bước sau.

## Ví dụ

Lệnh `/hoi`:
1. [Đối số lệnh](/reference/blocks/options/option_command_argument) tên `cauhoi`.
2. [Trì hoãn phản hồi](/reference/blocks/actions/action_response_defer) (vì AI có thể chậm).
3. **Hỏi AI**, prompt = `{{ arg('cauhoi') }}`. Đặt `id` = `ai`.
4. [Sửa tin nhắn phản hồi](/reference/blocks/actions/action_response_edit) với nội dung `{{ result('ai') }}`.

## Lưu ý & liên quan

- Tốn nhiều credit, tùy mô hình: từ **5** (gpt-4o-mini) đến **100** (gpt-4.1) mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Trì hoãn phản hồi](/reference/blocks/actions/action_response_defer)
- [Tìm kiếm web](/reference/blocks/actions/action_ai_web_search)
- [Hệ thống credit](/reference/credit-system)

<NodeInfoExplorer type="action_ai_chat_completion" />
