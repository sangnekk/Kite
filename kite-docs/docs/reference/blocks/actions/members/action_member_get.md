---
slug: /reference/blocks/actions/action_member_get
sidebar_position: 24
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lấy thành viên

<EmbedFlowNode type="action_member_get" />

> Đọc thông tin một thành viên trong server (kèm biệt danh, vai trò).

## Khi nào dùng

- Kiểm tra biệt danh hoặc vai trò của thành viên.
- Lấy dữ liệu thành viên để dùng trong điều kiện.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
>
> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').id` | ID người dùng |
| `result('id').username` | Tên đăng nhập |
| `result('id').discriminator` | Discriminator |
| `result('id').display_name` | Tên hiển thị |
| `result('id').avatar_url` | URL ảnh đại diện |
| `result('id').nick` | Biệt danh |

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy người dùng](/reference/blocks/actions/action_user_get)
- [Điều kiện vai trò](/reference/blocks/controls/control_condition_role)

<NodeInfoExplorer type="action_member_get" />
