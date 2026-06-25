---
sidebar_position: 43
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Kiểm tra cooldown

<EmbedFlowNode type="action_cooldown_check" />

> Kiểm tra (và đặt lại) thời gian chờ theo người dùng cho một hành động.

## Khi nào dùng

- Giới hạn lệnh `/daily`, `/work` mỗi X giờ một lần.
- Chống spam lệnh.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Phạm vi` — tính cooldown theo người dùng, kênh hay server.
>
> `Thời gian chờ` — độ dài của cooldown.
>
> `Chỉ kiểm tra` — chỉ xem thời gian còn lại mà không đặt lại cooldown.

## Kết quả trả về

Đặt một `id` cho khối rồi dùng `result('id')` để biết còn trong thời gian chờ hay không, và thời gian còn lại.

## Lưu ý & liên quan

- Bật `Chỉ kiểm tra` nếu chỉ muốn xem thời gian còn lại mà không đặt lại cooldown.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng số dư](/reference/blocks/actions/action_balance_add)
- [Điều kiện so sánh](/reference/blocks/controls/control_condition_compare)

<NodeInfoExplorer type="action_cooldown_check" />
