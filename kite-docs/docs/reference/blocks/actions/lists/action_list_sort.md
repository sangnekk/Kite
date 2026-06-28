---
slug: /reference/blocks/actions/action_list_sort
sidebar_position: 50
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Sắp xếp danh sách

<EmbedFlowNode type="action_list_sort" />

> Sắp xếp một danh sách tăng hoặc giảm dần.

## Khi nào dùng

- Sắp xếp điểm số, tên, giá trị trước khi hiển thị.
- Chuẩn bị dữ liệu cho bảng xếp hạng.

## Cấu hình

> `Danh sách` — danh sách đầu vào.
>
> `Thứ tự` — tăng dần hoặc giảm dần.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy danh sách đã sắp xếp bằng `result('id')`. Phần tử toàn số sẽ được so sánh theo giá trị số, ngược lại so sánh theo chuỗi.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Đảo danh sách](/reference/blocks/actions/action_list_reverse)

<NodeInfoExplorer type="action_list_sort" />
