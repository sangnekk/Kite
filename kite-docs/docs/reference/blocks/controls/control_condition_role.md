---
sidebar_position: 41
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Điều kiện role

<EmbedFlowNode type="control_condition_role" />

> Rẽ nhánh flow dựa trên vai trò của người dùng.

## Khi nào dùng

- Chỉ cho phép người có vai trò nhất định (vd Admin).
- Trao quyền theo vai trò.

## Cấu hình

> `Vai trò` — vai trò đem ra so khớp ở các nhánh.
>
> `Cho phép nhiều nhánh` — chạy mọi nhánh khớp thay vì chỉ nhánh đầu tiên.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Điều kiện người dùng](/reference/blocks/controls/control_condition_user)
- [Thêm vai trò cho thành viên](/reference/blocks/actions/action_member_role_add)

<NodeInfoExplorer type="control_condition_role" />
