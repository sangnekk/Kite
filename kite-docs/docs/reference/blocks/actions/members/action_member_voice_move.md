---
slug: /reference/blocks/actions/action_member_voice_move
sidebar_position: 25
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Chuyển kênh thoại

<EmbedFlowNode type="action_member_voice_move" />

> Chuyển một thành viên sang kênh thoại khác.

## Khi nào dùng

- Kéo thành viên vào kênh thoại theo flow (ví dụ phòng chờ → phòng họp).
- Tự động sắp xếp thành viên giữa các kênh thoại.

## Cấu hình

> `Thành viên` — thành viên cần chuyển (ID hoặc biểu thức như `{{ user.id }}`).
>
> `Kênh` — kênh thoại đích (ID hoặc biểu thức).
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Bot cần quyền **Di chuyển thành viên**; thành viên phải đang ở trong một kênh thoại.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Ngắt khỏi kênh thoại](/reference/blocks/actions/action_member_voice_disconnect)

<NodeInfoExplorer type="action_member_voice_move" />
