---
slug: /reference/blocks/actions/action_table_find_one
sidebar_position: 55
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tìm một dòng

<EmbedFlowNode type="action_table_find_one" />

> Lấy bản ghi đầu tiên khớp bộ lọc và thứ tự sắp xếp.

## Cấu hình

> `Bảng dữ liệu` — bảng cần đọc.
>
> `Server ID` — bắt buộc với bảng theo máy chủ.
>
> `Bộ lọc` — một hoặc nhiều điều kiện theo cột; giá trị hỗ trợ template.
>
> `Sắp xếp` — quyết định dòng nào là dòng đầu tiên khi có nhiều kết quả.

Ví dụ lọc `user_id = {{ user.id }}` và `item_id = sword_01`.

## Kết quả trả về

Với ID khối `find_item`:

```text
{{ result('find_item').found }}
{{ result('find_item').row.quantity }}
```

Khi không có kết quả, `found` là `false` và `row` là `null`. Luôn kiểm tra `found` trước khi đọc trường trong `row`.

## Lưu ý và liên quan

- `row` dùng tên cột, không dùng ID nội bộ.
- Tốn **1 credit** mỗi lần chạy.
- [Hướng dẫn bảng dữ liệu](/reference/custom-tables)
- [Truy vấn bảng](/reference/blocks/actions/action_table_query)

<NodeInfoExplorer type="action_table_find_one" />
