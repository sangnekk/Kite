---
sidebar_position: 17
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo role

<EmbedFlowNode type="action_role_create" />

> Tạo một vai trò mới trong server.

## Khi nào dùng

- Tạo vai trò tự động (vai trò thành viên, vai trò sự kiện, vai trò thưởng).
- Dựng sẵn vai trò khi thiết lập server theo flow.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
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

- Bot cần quyền **Quản lý vai trò**; vai trò tạo ra luôn nằm dưới vai trò cao nhất của bot.
- Vị trí (thứ tự) không đặt được khi tạo — sắp xếp vai trò là thao tác riêng của Discord.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Chỉnh sửa role](/reference/blocks/actions/action_role_edit)
- [Xóa role](/reference/blocks/actions/action_role_delete)

<NodeInfoExplorer type="action_role_create" />
