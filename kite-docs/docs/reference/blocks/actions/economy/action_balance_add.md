---
slug: /reference/blocks/actions/action_balance_add
sidebar_position: 38
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Cộng số dư

<EmbedFlowNode type="action_balance_add" />

> Cộng tiền vào số dư của một người dùng.

## Khi nào dùng

- Thưởng xu khi điểm danh (`/daily`), chơi game, hoạt động.
- Hoàn tiền.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Người dùng` — chủ số dư (mặc định là người chạy lệnh `{{ user.id }}`).
>
> `Số tiền` — số lượng cần cộng/trừ/đặt.

## Ví dụ

Lệnh `/daily`:
1. [Kiểm tra cooldown](/reference/blocks/actions/action_cooldown_check) 24 giờ.
2. **Cộng số dư**: `Biến` = `coins`, `Người dùng` = `{{ user.id }}`, `Số tiền` = `100`.
3. Phản hồi `Bạn nhận 100 xu!`

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Trừ số dư](/reference/blocks/actions/action_balance_remove)
- [Kiểm tra cooldown](/reference/blocks/actions/action_cooldown_check)
- [Xem số dư](/reference/blocks/actions/action_balance_get)

<NodeInfoExplorer type="action_balance_add" />
