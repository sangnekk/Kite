---
slug: /reference/blocks/actions/action_thread_member_add
sidebar_position: 26
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Thêm thành viên vào thread

<EmbedFlowNode type="action_thread_member_add" />

> Thêm một thành viên vào luồng.

## Khi nào dùng

- Mời người liên quan vào luồng ticket/thảo luận.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo luồng](/reference/blocks/actions/action_thread_create)
- [Xóa thành viên khỏi luồng](/reference/blocks/actions/action_thread_member_remove)

<NodeInfoExplorer type="action_thread_member_add" />
