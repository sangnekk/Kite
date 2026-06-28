---
sidebar_position: 17
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xóa role

<EmbedFlowNode type="action_role_delete" />

> Xóa một vai trò khỏi server.

## Khi nào dùng

- Dọn vai trò tạm sau khi sự kiện kết thúc.
- Xóa vai trò do flow tạo ra khi không còn cần.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
>
> `Vai trò` — vai trò đích (ID hoặc biểu thức).

## Lưu ý & liên quan

- Bot cần quyền **Quản lý vai trò** và vai trò đích phải nằm dưới vai trò cao nhất của bot.
- Hành động này không thể hoàn tác — vai trò sẽ bị gỡ khỏi mọi thành viên.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo role](/reference/blocks/actions/action_role_create)
- [Chỉnh sửa role](/reference/blocks/actions/action_role_edit)

<NodeInfoExplorer type="action_role_delete" />
