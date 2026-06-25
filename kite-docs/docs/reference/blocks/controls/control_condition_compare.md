---
sidebar_position: 38
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Điều kiện so sánh

<EmbedFlowNode type="control_condition_compare" />

> Rẽ nhánh flow bằng cách so sánh hai giá trị (bằng, lớn hơn, chứa...).

## Khi nào dùng

- Chạy hành động khác nhau theo kết quả so sánh.
- Kiểm tra một giá trị trước khi tiếp tục.

## Cấu hình

> `Giá trị gốc` — giá trị đem ra so sánh ở các nhánh.
>
> `Cho phép nhiều nhánh` — chạy mọi nhánh khớp thay vì chỉ nhánh đầu tiên.

## Ví dụ

Kiểm tra đủ tiền:
1. `Giá trị gốc` = số dư `{{ result('bal') }}`.
2. Thêm nhánh **≥ 50** → cho mua; nhánh **Ngược lại** → báo thiếu tiền.

## Lưu ý & liên quan

- Khối này tạo cấu trúc phân nhánh; mỗi nhánh là một so sánh khác nhau.
- Khối này **không tốn credit**.
- [Điều kiện người dùng](/reference/blocks/controls/control_condition_user)
- [Điều kiện vai trò](/reference/blocks/controls/control_condition_role)
- [Các khối](/reference/blocks/)

<NodeInfoExplorer type="control_condition_compare" />
