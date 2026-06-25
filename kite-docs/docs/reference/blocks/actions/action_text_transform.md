---
sidebar_position: 45
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Biến đổi văn bản

<EmbedFlowNode type="action_text_transform" />

> Biến đổi văn bản: hoa/thường, cắt khoảng trắng, thay thế, tách chuỗi.

## Khi nào dùng

- Chuẩn hoá dữ liệu người dùng nhập.
- Tách/ghép chuỗi để xử lý tiếp.

## Cấu hình

> `Văn bản` — văn bản đầu vào.
>
> `Thao tác` — phép biến đổi: hoa/thường, cắt, thay thế, tách...
>
> `Tham số 1` — tham số phụ cho thao tác (nếu cần).
>
> `Tham số 2` — tham số phụ thứ hai (nếu cần).

## Kết quả trả về

Đặt một `id` cho khối rồi lấy văn bản kết quả bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Định dạng số](/reference/blocks/actions/action_number_format)
- [Biểu thức](/reference/expressions)

<NodeInfoExplorer type="action_text_transform" />
