---
slug: /reference/blocks/actions/action_regex_match
sidebar_position: 45
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# So khớp Regex

<EmbedFlowNode type="action_regex_match" />

> Khớp văn bản với một biểu thức chính quy và lấy các nhóm bắt được.

## Khi nào dùng

- Kiểm tra định dạng đầu vào (email, mã, số điện thoại...).
- Trích xuất phần dữ liệu từ một chuỗi.

## Cấu hình

> `Văn bản` — văn bản nguồn để khớp.
>
> `Biểu thức (Regex)` — mẫu biểu thức chính quy (cú pháp Go/RE2).
>
> `Cờ` — tùy chọn: `i` (không phân biệt hoa/thường), `m` (nhiều dòng), `s` (`.` khớp cả xuống dòng).

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').matched` | `true` nếu khớp, ngược lại `false` |
| `result('id').groups` | Danh sách nhóm bắt được (phần tử `0` là toàn bộ đoạn khớp) |

## Lưu ý & liên quan

- Dùng cú pháp RE2 của Go (không hỗ trợ lookahead/lookbehind).
- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Biến đổi văn bản](/reference/blocks/actions/action_text_transform)

<NodeInfoExplorer type="action_regex_match" />
