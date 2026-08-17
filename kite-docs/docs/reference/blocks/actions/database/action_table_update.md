---
slug: /reference/blocks/actions/action_table_update
sidebar_position: 57
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Cập nhật dòng dữ liệu

<EmbedFlowNode type="action_table_update" />

> Cập nhật các bản ghi khớp bộ lọc.

## Cấu hình

> `Bảng dữ liệu` và `Server ID` — chọn bảng/phạm vi cần sửa.
>
> `Bộ lọc` — bắt buộc để tránh cập nhật nhầm toàn bảng.
>
> `Cập nhật` — chọn `Đặt giá trị`, `Tăng` hoặc `Giảm`. Tăng/giảm chỉ dùng cho cột Số.

Ví dụ tìm inventory theo `user_id` và `item_id`, sau đó **Tăng** `quantity` thêm `1`. Phép tăng/giảm được thực hiện trong transaction để tránh mất cập nhật khi nhiều flow chạy gần nhau.

## Kết quả trả về

Với ID khối `add_quantity`:

```text
{{ result('add_quantity').affected_rows }}
```

## Lưu ý và liên quan

- Khối lỗi và rollback nếu giá trị mới sai kiểu hoặc vi phạm Unique.
- Tốn **1 credit** mỗi lần chạy.
- [Hướng dẫn bảng dữ liệu](/reference/custom-tables)
- [Tìm một dòng](/reference/blocks/actions/action_table_find_one)

<NodeInfoExplorer type="action_table_update" />
