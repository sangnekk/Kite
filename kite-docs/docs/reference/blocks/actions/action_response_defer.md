---
sidebar_position: 6
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Trì hoãn phản hồi

<EmbedFlowNode type="action_response_defer" />

> Báo cho Discord biết bot đang xử lý, mua thêm thời gian trước khi phản hồi thật.

## Khi nào dùng

- Khi flow cần hơn 3 giây (gọi API, hỏi AI) trước khi trả lời.
- Tránh lỗi “ứng dụng không phản hồi” của Discord.

## Cấu hình

> `Chỉ mình tôi thấy` — nếu bật, chỉ người gọi lệnh nhìn thấy phản hồi (ephemeral).

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create)
- [Hỏi AI](/reference/blocks/actions/action_ai_chat_completion)

<NodeInfoExplorer type="action_response_defer" />
