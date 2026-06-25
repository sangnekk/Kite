---
sidebar_position: 23
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Gỡ role khỏi thành viên

<EmbedFlowNode type="action_member_role_remove" />

> Gỡ một vai trò khỏi thành viên.

## Khi nào dùng

- Nút bỏ nhận vai trò.
- Thu hồi vai trò khi hết điều kiện.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Vai trò` — vai trò liên quan (ID hoặc biểu thức).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Thêm vai trò cho thành viên](/reference/blocks/actions/action_member_role_add)

<NodeInfoExplorer type="action_member_role_remove" />
