---
sidebar_position: 32
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tìm kiếm web

<EmbedFlowNode type="action_ai_web_search" />

> Để AI tìm kiếm thông tin trên internet rồi trả lời.

## Khi nào dùng

- Trả lời câu hỏi cần thông tin mới/thời sự.
- Tra cứu dữ kiện ngoài kiến thức sẵn có của mô hình.

## Cấu hình

> `Mô hình` — chọn mô hình AI; chi phí credit khác nhau theo mô hình.
>
> `Truy vấn` — nội dung cần tìm kiếm. Hỗ trợ [biểu thức](/reference/expressions).

## Kết quả trả về

Đặt một `id` cho khối rồi dùng `result('id')` để lấy kết quả tìm kiếm cho các bước sau.

## Lưu ý & liên quan

- Tốn rất nhiều credit, tùy mô hình: từ **25** đến **500** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Hỏi AI](/reference/blocks/actions/action_ai_chat_completion)
- [Hệ thống credit](/reference/credit-system)

<NodeInfoExplorer type="action_ai_web_search" />
