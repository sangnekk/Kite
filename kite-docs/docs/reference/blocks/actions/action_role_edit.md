---
sidebar_position: 17
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chỉnh sửa role

<EmbedFlowNode type="action_role_edit" />

> Chỉnh sửa một vai trò đã có.

## Khi nào dùng

- Đổi tên, màu, hoặc quyền của vai trò.
- Bật/tắt tách hiển thị riêng (hoist) hay cho phép nhắc (@).

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
>
> `Vai trò` — vai trò đích (ID hoặc biểu thức).
>
> `Thông tin vai trò` — tên, màu, quyền, và các thiết lập hiển thị/nhắc của vai trò.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').id` | ID vai trò |
| `result('id').name` | Tên vai trò |
| `result('id').color` | Màu vai trò |
| `result('id').hoist` | Có tách hiển thị riêng không |
| `result('id').mentionable` | Có thể nhắc (@) không |

## Lưu ý & liên quan

- Bot cần quyền **Quản lý vai trò** và vai trò đích phải nằm dưới vai trò cao nhất của bot.
- Vị trí (thứ tự) không đổi được tại đây — sắp xếp vai trò là thao tác riêng của Discord.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo role](/reference/blocks/actions/action_role_create)
- [Xóa role](/reference/blocks/actions/action_role_delete)

<NodeInfoExplorer type="action_role_edit" />
