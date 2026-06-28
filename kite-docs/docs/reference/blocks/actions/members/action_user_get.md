---
slug: /reference/blocks/actions/action_user_get
sidebar_position: 16
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lấy người dùng

<EmbedFlowNode type="action_user_get" />

> Đọc thông tin một người dùng Discord theo ID.

## Khi nào dùng

- Lấy tên hiển thị, ảnh đại diện của một người dùng bất kỳ.
- Khi cần dữ liệu người dùng không thuộc server hiện tại.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy thành viên](/reference/blocks/actions/action_member_get)

<NodeInfoExplorer type="action_user_get" />
