---
slug: /reference/blocks/actions/action_time_math
sidebar_position: 44
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Cộng/trừ thời gian

<EmbedFlowNode type="action_time_math" />

> Cộng hoặc trừ một khoảng thời gian vào một mốc thời gian.

## Khi nào dùng

- Tính thời điểm hết hạn (vd: bây giờ + 7 ngày).
- Dời mốc thời gian theo flow.

## Cấu hình

> `Thời gian` — mốc thời gian đầu vào (Unix giây hoặc chuỗi ISO 8601).
>
> `Số lượng` — số đơn vị cần cộng/trừ.
>
> `Đơn vị` — giây, phút, giờ hoặc ngày.
>
> `Phép tính` — cộng hoặc trừ.
>
> `Định dạng` — kiểu hiển thị thời gian kết quả.
>
> `Múi giờ` — múi giờ áp dụng khi hiển thị.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy mốc thời gian kết quả bằng `result('id')` (theo định dạng đã chọn).

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy thời gian hiện tại](/reference/blocks/actions/action_time_now)
- [Khoảng cách thời gian](/reference/blocks/actions/action_time_diff)

<NodeInfoExplorer type="action_time_math" />
