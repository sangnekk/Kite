---
sidebar_position: 45
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Biến đổi văn bản

<EmbedFlowNode type="action_text_transform" />

Khối `Text transform` biến đổi một chuỗi văn bản: chuyển hoa/thường, cắt khoảng trắng, lấy độ dài, thay thế hoặc tách thành danh sách.

### Cài đặt

> `Văn bản` Chuỗi đầu vào.
>
> `Thao tác` `upper`, `lower`, `trim`, `length`, `replace`, hoặc `split`.
>
> `Tham số 1` Với `replace` là chuỗi cần tìm; với `split` là ký tự phân tách.
>
> `Tham số 2` Với `replace` là chuỗi thay thế.

### Đầu ra
`length` trả về số, `split` trả về danh sách, còn lại trả về chuỗi.

<NodeInfoExplorer type="action_text_transform" />
