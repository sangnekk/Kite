---
slug: /reference/blocks/actions/action_balance_leaderboard
sidebar_position: 42
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Bảng xếp hạng số dư

<EmbedFlowNode type="action_balance_leaderboard" />

> Lấy danh sách những người có số dư cao nhất.

## Khi nào dùng

- Lệnh `/top` xếp hạng giàu nhất.
- Bảng vinh danh.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Số lượng` — số người hiển thị trong bảng xếp hạng.

## Kết quả trả về

Đặt một `id` cho khối, rồi dùng [Định dạng danh sách](/reference/blocks/actions/action_list_format) trên `result('id')` để render bảng xếp hạng.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Định dạng danh sách](/reference/blocks/actions/action_list_format)
- [Xem số dư](/reference/blocks/actions/action_balance_get)

<NodeInfoExplorer type="action_balance_leaderboard" />
