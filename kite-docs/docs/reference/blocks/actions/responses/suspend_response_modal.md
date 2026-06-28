---
slug: /reference/blocks/actions/suspend_response_modal
sidebar_position: 7
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Hiển thị modal

<EmbedFlowNode type="suspend_response_modal" />

> Hiện một form (modal) cho người dùng điền và tạm dừng flow đến khi họ gửi.

## Khi nào dùng

- Thu thập dữ liệu nhập tay: form đăng ký, khảo sát, báo cáo...
- Khi cần nhiều ô nhập trước khi xử lý tiếp.

## Cấu hình

> `Form` — các ô nhập của modal.

## Lưu ý & liên quan

- Modal là một [sub-flow](/reference/sub-flows). Đọc giá trị người dùng nhập bằng `input('id')` trong [biểu thức](/reference/expressions).
- Khối này **không tốn credit**.
- [Sub-flow](/reference/sub-flows)
- [Biểu thức](/reference/expressions)

<NodeInfoExplorer type="suspend_response_modal" />
