---
sidebar_position: 30
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đặt biến lưu trữ

<EmbedFlowNode type="action_variable_set" />

> Lưu một giá trị vào biến để dùng lại sau này, kể cả ở các lần chạy khác.

## Khi nào dùng

- Đếm số lần dùng lệnh, lưu điểm, ghi nhớ lựa chọn của người dùng.
- Lưu giá trị ngữ cảnh trước khi vào [sub-flow](/reference/sub-flows).

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Phạm vi` — khóa phân tách giá trị (vd theo người dùng, kênh, hoặc server).
>
> `Thao tác` — cách thay đổi giá trị: gán, cộng, trừ, nối...
>
> `Giá trị` — giá trị dùng cho thao tác.

## Ví dụ

Đếm lượt dùng lệnh theo người dùng:
1. `Biến` = `counter`, `Phạm vi` = `{{ user.id }}`.
2. `Thao tác` = **cộng**, `Giá trị` = `1`.
3. Đọc lại bằng [Lấy biến lưu trữ](/reference/blocks/actions/action_variable_get).

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy biến lưu trữ](/reference/blocks/actions/action_variable_get)
- [Xóa biến lưu trữ](/reference/blocks/actions/action_variable_delete)
- [Biến lưu trữ](/reference/variable)

<NodeInfoExplorer type="action_variable_set" />
