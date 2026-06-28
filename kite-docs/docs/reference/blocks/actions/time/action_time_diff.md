---
slug: /reference/blocks/actions/action_time_diff
sidebar_position: 44
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Khoảng cách thời gian

<EmbedFlowNode type="action_time_diff" />

> Tính khoảng cách giữa hai mốc thời gian theo đơn vị đã chọn.

## Khi nào dùng

- Tính số ngày/giờ còn lại đến một thời điểm.
- Đo thời lượng giữa hai sự kiện.

## Cấu hình

> `Thời gian A` — mốc thời gian thứ nhất (Unix giây hoặc ISO 8601).
>
> `Thời gian B` — mốc thời gian thứ hai (Unix giây hoặc ISO 8601).
>
> `Đơn vị` — giây, phút, giờ hoặc ngày.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy khoảng cách bằng `result('id')`. Kết quả là số `B − A` theo đơn vị đã chọn (có thể là số thập phân, âm nếu B trước A).

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Cộng/trừ thời gian](/reference/blocks/actions/action_time_math)

<NodeInfoExplorer type="action_time_diff" />
