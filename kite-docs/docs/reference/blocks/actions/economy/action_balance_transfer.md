---
slug: /reference/blocks/actions/action_balance_transfer
sidebar_position: 41
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Chuyển tiền

<EmbedFlowNode type="action_balance_transfer" />

> Chuyển tiền từ một người dùng sang người khác.

## Khi nào dùng

- Lệnh `/pay @người số_tiền`.
- Giao dịch giữa người chơi.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Người dùng` — chủ số dư (mặc định là người chạy lệnh `{{ user.id }}`).
>
> `Người nhận` — người nhận tiền khi chuyển.
>
> `Số tiền` — số lượng cần cộng/trừ/đặt.
>
> `Cho phép âm` — cho phép số dư xuống dưới 0 hay không.

## Ví dụ

Lệnh `/pay`:
1. [Đối số lệnh](/reference/blocks/options/option_command_argument) `nguoinhan` (kiểu người dùng) và `sotien` (số).
2. **Chuyển tiền**: `Người dùng` = `{{ user.id }}`, `Người nhận` = `{{ arg('nguoinhan') }}`, `Số tiền` = `{{ arg('sotien') }}`.

## Lưu ý & liên quan

- Tắt `Cho phép âm` để người gửi không chuyển quá số dư.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng số dư](/reference/blocks/actions/action_balance_add)
- [Xem số dư](/reference/blocks/actions/action_balance_get)

<NodeInfoExplorer type="action_balance_transfer" />
