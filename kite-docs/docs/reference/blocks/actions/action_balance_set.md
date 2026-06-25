---
sidebar_position: 40
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đặt số dư

<EmbedFlowNode type="action_balance_set" />

> Đặt số dư của một người dùng thành một giá trị cố định.

## Khi nào dùng

- Khởi tạo hoặc reset số dư.
- Sửa số dư thủ công (lệnh admin).

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Người dùng` — chủ số dư (mặc định là người chạy lệnh `{{ user.id }}`).
>
> `Số tiền` — số lượng cần cộng/trừ/đặt.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng số dư](/reference/blocks/actions/action_balance_add)
- [Trừ số dư](/reference/blocks/actions/action_balance_remove)

<NodeInfoExplorer type="action_balance_set" />
