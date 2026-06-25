---
sidebar_position: 39
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Điều kiện người dùng

<EmbedFlowNode type="control_condition_user" />

> Rẽ nhánh flow dựa trên người dùng (là ai, có thuộc tính nào...).

## Khi nào dùng

- Chỉ cho phép một số người dùng nhất định.
- Xử lý khác nhau theo người dùng.

## Cấu hình

> `Người dùng` — người dùng đem ra so khớp ở các nhánh.
>
> `Cho phép nhiều nhánh` — chạy mọi nhánh khớp thay vì chỉ nhánh đầu tiên.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Điều kiện so sánh](/reference/blocks/controls/control_condition_compare)
- [Điều kiện vai trò](/reference/blocks/controls/control_condition_role)

<NodeInfoExplorer type="control_condition_user" />
