---
sidebar_position: 3
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Nút bấm

<EmbedFlowNode type="entry_component_button" />

> Điểm bắt đầu khi người dùng bấm một nút trên tin nhắn.

## Khi nào dùng

- Xử lý khi người dùng nhấn nút trong một [sub-flow](/reference/sub-flows).
- Thường được tạo tự động khi bạn thêm nút vào tin nhắn.

## Lưu ý & liên quan

- Nút bấm tạo ra [sub-flow](/reference/sub-flows): flow tiếp tục từ nhánh của nút khi người dùng bấm.
- Khối này **không tốn credit**.
- [Sub-flow](/reference/sub-flows)
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)

<NodeInfoExplorer type="entry_component_button" />
