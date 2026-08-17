---
slug: /reference/blocks/actions/action_table_query
sidebar_position: 56
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Truy vấn bảng

<EmbedFlowNode type="action_table_query" />

> Lấy danh sách bản ghi có lọc, sắp xếp và phân trang.

## Cấu hình

> `Bảng dữ liệu` — bảng cần truy vấn.
>
> `Server ID` — bắt buộc với bảng theo máy chủ.
>
> `Bộ lọc` — chọn khớp tất cả hoặc bất kỳ điều kiện nào.
>
> `Sắp xếp` — thứ tự tăng/giảm theo cột.
>
> `Giới hạn` và `Bỏ qua` — số dòng lấy và offset phân trang. Giới hạn tối đa là 100.

## Kết quả trả về

Với ID khối `list_items`:

```text
{{ result('list_items').rows }}
{{ result('list_items').count }}
{{ result('list_items').total_count }}
```

`count` là số dòng trong trang hiện tại; `total_count` là tổng số dòng khớp trước khi phân trang. Mỗi phần tử trong `rows` dùng tên cột và có metadata của dòng.

## Lưu ý và liên quan

- Có thể nối `rows` sang [Định dạng danh sách](/reference/blocks/actions/action_list_format).
- Tốn **1 credit** mỗi lần chạy.
- [Hướng dẫn bảng dữ liệu](/reference/custom-tables)
- [Tìm một dòng](/reference/blocks/actions/action_table_find_one)

<NodeInfoExplorer type="action_table_query" />
