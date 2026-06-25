---
sidebar_position: 20
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Gỡ cấm thành viên

<EmbedFlowNode type="action_member_unban" />

> Gỡ lệnh cấm cho một người dùng.

## Khi nào dùng

- Khôi phục quyền truy cập cho người đã bị cấm.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cấm thành viên](/reference/blocks/actions/action_member_ban)

<NodeInfoExplorer type="action_member_unban" />
