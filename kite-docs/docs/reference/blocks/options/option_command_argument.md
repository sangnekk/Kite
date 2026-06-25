---
sidebar_position: 45
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đối số lệnh

<EmbedFlowNode type="option_command_argument" />

> Khai báo một đối số (tham số) cho lệnh để người dùng nhập.

## Khi nào dùng

- Cho phép `/say nội_dung`, `/ban @người`...
- Nhận dữ liệu đầu vào cho lệnh.

## Cấu hình

> `Tên` / `Mô tả` — tên và mô tả của đối số.
>
> `Kiểu` — kiểu dữ liệu (văn bản, số, người dùng, kênh...).
>
> `Bắt buộc` — người dùng có buộc phải nhập không.
>
> `Giới hạn / Lựa chọn` — min/max, độ dài tối đa, hoặc danh sách lựa chọn cố định.

## Lưu ý & liên quan

- Đọc giá trị đối số trong [biểu thức](/reference/expressions) bằng `arg('tên')`.
- Khối này **không tốn credit**.
- [Lệnh](/reference/blocks/entries/entry_command)
- [Biểu thức](/reference/expressions)

<NodeInfoExplorer type="option_command_argument" />
