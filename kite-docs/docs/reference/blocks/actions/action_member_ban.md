---
sidebar_position: 18
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Cấm thành viên

<EmbedFlowNode type="action_member_ban" />

> Cấm một thành viên khỏi server.

## Khi nào dùng

- Xử lý vi phạm nghiêm trọng.
- Tự động cấm theo tiêu chí trong flow kiểm duyệt.

## Cấu hình

> `Người dùng` — người cần tác động (ID hoặc `{{ user.id }}`).
>
> `Xóa tin nhắn` — xóa tin nhắn gần đây của người bị cấm trong khoảng (giây).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Bỏ cấm thành viên](/reference/blocks/actions/action_member_unban)
- [Đuổi thành viên](/reference/blocks/actions/action_member_kick)

<NodeInfoExplorer type="action_member_ban" />
