---
slug: /reference/blocks/actions/action_member_timeout
sidebar_position: 21
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Giới hạn trò chuyện thành viên

<EmbedFlowNode type="action_member_timeout" />

> Tạm khóa một thành viên: họ không nhắn/nói được trong một khoảng thời gian.

## Khi nào dùng

- Phạt nhẹ mà không cần đuổi/cấm.
- Hạ nhiệt tình huống tạm thời.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Thời lượng` — thời gian tạm khóa (giây).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Đuổi thành viên](/reference/blocks/actions/action_member_kick)
- [Cấm thành viên](/reference/blocks/actions/action_member_ban)

<NodeInfoExplorer type="action_member_timeout" />
