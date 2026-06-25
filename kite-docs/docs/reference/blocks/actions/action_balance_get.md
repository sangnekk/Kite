---
sidebar_position: 37
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xem số dư

<EmbedFlowNode type="action_balance_get" />

> Lấy số dư của một người dùng cho một loại tiền tệ.

## Khi nào dùng

- Hiển thị số dư (lệnh `/balance`).
- Kiểm tra đủ tiền trước khi mua/chuyển.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Người dùng` — chủ số dư (mặc định là người chạy lệnh `{{ user.id }}`).

## Kết quả trả về

Đặt một `id` cho khối rồi lấy số dư bằng `result('id')`.

## Ví dụ

Lệnh `/balance`:
1. **Xem số dư**: `Biến` = `coins`, `Người dùng` = `{{ user.id }}`. Đặt `id` = `bal`.
2. Phản hồi `Bạn có {{ result('bal') }} xu.`

## Lưu ý & liên quan

- Một loại tiền tệ là một [biến lưu trữ](/reference/variable) có bật phạm vi (scoped). Chưa có số dư thì trả về `0`.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng số dư](/reference/blocks/actions/action_balance_add)
- [Bảng xếp hạng](/reference/blocks/actions/action_balance_leaderboard)
- [Biến lưu trữ](/reference/variable)

<NodeInfoExplorer type="action_balance_get" />
