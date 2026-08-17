---
slug: /reference/blocks/actions/action_table_delete
sidebar_position: 58
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Xóa dòng dữ liệu

<EmbedFlowNode type="action_table_delete" />

> Xóa các bản ghi khớp bộ lọc.

:::warning Dữ liệu đã xóa không thể khôi phục

Kiểm tra kỹ bảng, Server ID và bộ lọc. Khối bắt buộc có ít nhất một điều kiện để giảm nguy cơ xóa nhầm toàn bảng.

:::

## Cấu hình

> `Bảng dữ liệu` và `Server ID` — chọn bảng/phạm vi cần xóa.
>
> `Bộ lọc` — các điều kiện xác định dòng cần xóa.

Ví dụ xóa một cảnh cáo theo `id = {{ option.warn_id }}`.

## Kết quả trả về

Với ID khối `delete_warn`:

```text
{{ result('delete_warn').affected_rows }}
```

Nên kiểm tra `affected_rows` để biết có dòng nào thực sự bị xóa hay không.

## Lưu ý và liên quan

- Tốn **1 credit** mỗi lần chạy.
- [Hướng dẫn bảng dữ liệu](/reference/custom-tables)
- [Tìm một dòng](/reference/blocks/actions/action_table_find_one)

<NodeInfoExplorer type="action_table_delete" />
