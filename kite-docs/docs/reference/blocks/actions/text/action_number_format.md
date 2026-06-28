---
slug: /reference/blocks/actions/action_number_format
sidebar_position: 46
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Định dạng số

<EmbedFlowNode type="action_number_format" />

> Định dạng số cho dễ đọc: dấu phẩy nghìn, rút gọn K/M, số thập phân.

## Khi nào dùng

- Hiển thị số dư/điểm gọn gàng (vd `1.2K`).
- Làm tròn số thập phân.

## Cấu hình

> `Số` — số cần định dạng.
>
> `Kiểu` — dấu phẩy nghìn, rút gọn K/M, hoặc số thập phân.
>
> `Số chữ số thập phân`.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy chuỗi đã định dạng bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Biến đổi văn bản](/reference/blocks/actions/action_text_transform)
- [Xem số dư](/reference/blocks/actions/action_balance_get)

<NodeInfoExplorer type="action_number_format" />
