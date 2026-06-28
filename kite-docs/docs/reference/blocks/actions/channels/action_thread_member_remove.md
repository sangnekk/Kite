---
slug: /reference/blocks/actions/action_thread_member_remove
sidebar_position: 26
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Xóa thành viên khỏi thread

<EmbedFlowNode type="action_thread_member_remove" />

> Gỡ một thành viên khỏi luồng.

## Khi nào dùng

- Loại người khỏi luồng riêng khi không còn liên quan.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Thêm thành viên vào luồng](/reference/blocks/actions/action_thread_member_add)

<NodeInfoExplorer type="action_thread_member_remove" />
