---
sidebar_position: 40
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Điều kiện kênh

<EmbedFlowNode type="control_condition_channel" />

> Rẽ nhánh flow dựa trên kênh.

## Khi nào dùng

- Chỉ phản hồi ở một số kênh.
- Xử lý khác nhau theo kênh.

## Cấu hình

> `Kênh` — kênh đem ra so khớp ở các nhánh.
>
> `Cho phép nhiều nhánh` — chạy mọi nhánh khớp thay vì chỉ nhánh đầu tiên.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Điều kiện so sánh](/reference/blocks/controls/control_condition_compare)
- [Bộ lọc sự kiện](/reference/blocks/options/option_event_filter)

<NodeInfoExplorer type="control_condition_channel" />
