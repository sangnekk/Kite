---
slug: /reference/blocks/actions/action_variable_get
sidebar_position: 29
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lấy biến lưu trữ

<EmbedFlowNode type="action_variable_get" />

> Đọc lại giá trị đã lưu trong một biến.

## Khi nào dùng

- Hiển thị điểm/đếm đã lưu.
- Dùng giá trị đã lưu trong điều kiện hoặc tính toán.

## Cấu hình

> `Biến` — chọn một [biến lưu trữ](/reference/variable).
>
> `Phạm vi` — khóa phân tách giá trị (vd theo người dùng, kênh, hoặc server).

## Kết quả trả về

Đặt một `id` cho khối rồi lấy giá trị đã đọc bằng `result('id')` ở các bước sau.

## Ví dụ

1. `Biến` = `counter`, `Phạm vi` = `{{ user.id }}`. Đặt `id` = `c`.
2. Dùng `{{ result('c') }}` trong tin nhắn phản hồi.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Đặt biến lưu trữ](/reference/blocks/actions/action_variable_set)
- [Biến lưu trữ](/reference/variable)

<NodeInfoExplorer type="action_variable_get" />
