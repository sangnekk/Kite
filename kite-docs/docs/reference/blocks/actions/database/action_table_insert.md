---
slug: /reference/blocks/actions/action_table_insert
sidebar_position: 54
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Thêm dòng dữ liệu

<EmbedFlowNode type="action_table_insert" />

> Thêm một bản ghi mới vào bảng dữ liệu tùy chỉnh.

## Cấu hình

> `Bảng dữ liệu` — chọn bảng đã tạo trong tab **Dữ liệu**.
>
> `Server ID` — bắt buộc với bảng theo máy chủ; thường dùng `{{ guild.id }}`.
>
> `Dữ liệu` — nhập key/value theo schema. Chuỗi hỗ trợ template; dùng **Chỉnh JSON nâng cao** cho object hoặc array lồng nhau.

Ví dụ thêm inventory:

```json
{
  "user_id": "{{ user.id }}",
  "item_id": "sword_01",
  "quantity": 1
}
```

## Kết quả trả về

Với ID khối `add_item`:

```text
{{ result('add_item').id }}
{{ result('add_item').row.quantity }}
```

`row` chứa các cột theo tên cùng metadata `id`, `scope_id`, `version`, `created_at`, `updated_at`.

## Lưu ý và liên quan

- Default được áp dụng cho cột không truyền; cột bắt buộc phải có giá trị.
- Khối lỗi nếu vi phạm Unique.
- Tốn **1 credit** mỗi lần chạy.
- [Hướng dẫn bảng dữ liệu](/reference/custom-tables)
- [Tìm một dòng](/reference/blocks/actions/action_table_find_one)

<NodeInfoExplorer type="action_table_insert" />
