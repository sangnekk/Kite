---
slug: /reference/blocks/actions/action_role_get
sidebar_position: 17
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lấy role

<EmbedFlowNode type="action_role_get" />

> Đọc thông tin một vai trò theo ID.

## Khi nào dùng

- Lấy tên/màu vai trò để hiển thị.
- Kiểm tra thuộc tính vai trò trước khi xử lý.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
>
> `Vai trò` — vai trò liên quan (ID hoặc biểu thức).

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

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Điều kiện vai trò](/reference/blocks/controls/control_condition_role)

<NodeInfoExplorer type="action_role_get" />
