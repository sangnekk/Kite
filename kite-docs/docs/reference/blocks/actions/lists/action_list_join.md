---
slug: /reference/blocks/actions/action_list_join
sidebar_position: 49
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Nối danh sách

<EmbedFlowNode type="action_list_join" />

> Nối các phần tử của danh sách thành một chuỗi.

## Khi nào dùng

- Ghép danh sách thành câu, phân tách bằng dấu phẩy.
- Hiển thị nhiều giá trị trên một dòng.

## Cấu hình

> `Danh sách` — danh sách đầu vào.
>
> `Ký tự nối` — chuỗi chèn giữa các phần tử.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy chuỗi đã nối bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Định dạng danh sách](/reference/blocks/actions/action_list_format)

<NodeInfoExplorer type="action_list_join" />
