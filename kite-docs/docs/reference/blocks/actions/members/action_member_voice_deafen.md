---
slug: /reference/blocks/actions/action_member_voice_deafen
sidebar_position: 25
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Chặn/bỏ chặn nghe

<EmbedFlowNode type="action_member_voice_deafen" />

> Chặn nghe hoặc bỏ chặn nghe một thành viên trong kênh thoại.

## Khi nào dùng

- Chặn nghe thành viên theo flow.
- Bỏ chặn nghe lại sau một khoảng thời gian.

## Cấu hình

> `Thành viên` — thành viên cần chặn/bỏ chặn nghe (ID hoặc biểu thức như `{{ user.id }}`).
>
> `Chặn nghe (deafen)` — bật để chặn nghe, tắt để bỏ chặn.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Bot cần quyền **Chặn nghe thành viên**; thành viên phải đang ở trong một kênh thoại.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tắt/bật tiếng thoại](/reference/blocks/actions/action_member_voice_mute)

<NodeInfoExplorer type="action_member_voice_deafen" />
