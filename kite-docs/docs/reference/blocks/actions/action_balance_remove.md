---
sidebar_position: 39
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Trừ số dư

<EmbedFlowNode type="action_balance_remove" />

> Trừ tiền khỏi số dư của một người dùng.

## Khi nào dùng

- Trừ xu khi mua vật phẩm/dịch vụ.
- Phạt tiền trong game.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Người dùng` — chủ số dư (mặc định là người chạy lệnh `{{ user.id }}`).
>
> `Số tiền` — số lượng cần cộng/trừ/đặt.
>
> `Cho phép âm` — cho phép số dư xuống dưới 0 hay không.

## Ví dụ

Mua vật phẩm giá 50 xu:
1. [Xem số dư](/reference/blocks/actions/action_balance_get) + [Điều kiện so sánh](/reference/blocks/controls/control_condition_compare) kiểm tra đủ tiền.
2. **Trừ số dư**: `Số tiền` = `50`, tắt `Cho phép âm`.

## Lưu ý & liên quan

- Tắt `Cho phép âm` để chặn tiêu quá số dư.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng số dư](/reference/blocks/actions/action_balance_add)
- [Điều kiện so sánh](/reference/blocks/controls/control_condition_compare)

<NodeInfoExplorer type="action_balance_remove" />
