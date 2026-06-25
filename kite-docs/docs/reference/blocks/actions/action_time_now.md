---
sidebar_position: 44
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lấy thời gian hiện tại

<EmbedFlowNode type="action_time_now" />

> Lấy thời gian hiện tại theo định dạng và múi giờ đã chọn.

## Khi nào dùng

- Đóng dấu thời gian cho log/tin nhắn.
- Hiển thị giờ hiện tại.

## Cấu hình

> `Định dạng` — kiểu hiển thị thời gian.
>
> `Múi giờ` — múi giờ áp dụng.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy chuỗi thời gian bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Định dạng số](/reference/blocks/actions/action_number_format)

<NodeInfoExplorer type="action_time_now" />
