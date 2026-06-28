---
slug: /reference/blocks/actions/action_member_edit
sidebar_position: 25
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Chỉnh sửa thành viên

<EmbedFlowNode type="action_member_edit" />

> Đổi biệt danh của một thành viên trong server.

## Khi nào dùng

- Chuẩn hoá biệt danh theo quy ước server.
- Gắn nhãn vai trò vào biệt danh.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Biệt danh` — biệt danh mới cho thành viên.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Thêm vai trò cho thành viên](/reference/blocks/actions/action_member_role_add)

<NodeInfoExplorer type="action_member_edit" />
