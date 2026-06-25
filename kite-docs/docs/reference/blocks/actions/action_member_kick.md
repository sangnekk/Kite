---
sidebar_position: 19
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đuổi thành viên

<EmbedFlowNode type="action_member_kick" />

> Đuổi một thành viên khỏi server (họ có thể quay lại nếu được mời).

## Khi nào dùng

- Xử lý vi phạm ở mức vừa.
- Dọn thành viên không hoạt động.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cấm thành viên](/reference/blocks/actions/action_member_ban)
- [Tạm khóa thành viên](/reference/blocks/actions/action_member_timeout)

<NodeInfoExplorer type="action_member_kick" />
