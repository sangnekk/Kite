---
slug: /reference/blocks/actions/action_member_voice_disconnect
sidebar_position: 25
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Ngắt khỏi kênh thoại

<EmbedFlowNode type="action_member_voice_disconnect" />

> Ngắt một thành viên khỏi kênh thoại họ đang ở.

## Khi nào dùng

- Đá thành viên khỏi kênh thoại khi vi phạm.
- Dọn kênh thoại sau khi sự kiện kết thúc.

## Cấu hình

> `Thành viên` — thành viên cần ngắt (ID hoặc biểu thức như `{{ user.id }}`).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Bot cần quyền **Di chuyển thành viên**; thành viên phải đang ở trong một kênh thoại.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Chuyển kênh thoại](/reference/blocks/actions/action_member_voice_move)

<NodeInfoExplorer type="action_member_voice_disconnect" />
