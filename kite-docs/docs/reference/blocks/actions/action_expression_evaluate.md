---
sidebar_position: 34
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tính biểu thức

<EmbedFlowNode type="action_expression_evaluate" />

> Chạy một biểu thức (tính toán, logic, biến đổi) và lưu kết quả để dùng tiếp.

## Khi nào dùng

- Tính toán số học, ghép chuỗi, xử lý logic.
- Lưu giá trị ngữ cảnh vào biến tạm trước khi vào [sub-flow](/reference/sub-flows).

## Cấu hình

> `Biểu thức` — biểu thức cần tính. Xem [Biểu thức](/reference/expressions).

## Kết quả trả về

Đặt một `id` cho khối rồi lấy kết quả tính toán bằng `result('id')`.

## Ví dụ

Tính tổng hai đối số:
1. `Biểu thức` = `arg('a') + arg('b')`.
2. Đặt `id` = `tong`, dùng `{{ result('tong') }}` trong phản hồi.

## Lưu ý & liên quan

- Trong khối này bạn **bỏ** dấu `{{` và `}}` quanh biểu thức.
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Biểu thức](/reference/expressions)
- [Định dạng số](/reference/blocks/actions/action_number_format)

<NodeInfoExplorer type="action_expression_evaluate" />
