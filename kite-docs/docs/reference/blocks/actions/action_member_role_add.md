---
sidebar_position: 22
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Thêm role cho thành viên

<EmbedFlowNode type="action_member_role_add" />

> Gán một vai trò cho thành viên.

## Khi nào dùng

- Tạo nút/lệnh tự nhận vai trò.
- Tự gán vai trò mặc định cho thành viên mới.
- Trao vai trò theo điều kiện (cấp độ, mua hàng...).

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Vai trò` — vai trò liên quan (ID hoặc biểu thức).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Ví dụ

Tự gán vai trò khi vào server:
1. [Lắng nghe sự kiện](/reference/blocks/entries/entry_event) → **Member Join**.
2. **Thêm vai trò cho thành viên**: `Người dùng` = `{{ user.id }}`, `Vai trò` = ID vai trò `Thành viên`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Xóa vai trò khỏi thành viên](/reference/blocks/actions/action_member_role_remove)
- [Điều kiện vai trò](/reference/blocks/controls/control_condition_role)

<NodeInfoExplorer type="action_member_role_add" />
