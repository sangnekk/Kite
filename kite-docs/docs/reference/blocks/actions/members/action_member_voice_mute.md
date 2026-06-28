---
slug: /reference/blocks/actions/action_member_voice_mute
sidebar_position: 25
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tắt/bật tiếng thoại

<EmbedFlowNode type="action_member_voice_mute" />

> Tắt tiếng hoặc bật tiếng một thành viên trong kênh thoại.

## Khi nào dùng

- Tắt tiếng thành viên gây ồn theo flow.
- Bật tiếng lại sau một khoảng thời gian.

## Cấu hình

> `Thành viên` — thành viên cần tắt/bật tiếng (ID hoặc biểu thức như `{{ user.id }}`).
>
> `Tắt tiếng (mute)` — bật để tắt tiếng, tắt để bỏ tắt tiếng.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Lưu ý & liên quan

- Bot cần quyền **Tắt tiếng thành viên**; thành viên phải đang ở trong một kênh thoại.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Chặn/bỏ chặn nghe](/reference/blocks/actions/action_member_voice_deafen)

<NodeInfoExplorer type="action_member_voice_mute" />
