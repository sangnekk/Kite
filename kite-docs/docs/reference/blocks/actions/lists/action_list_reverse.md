---
slug: /reference/blocks/actions/action_list_reverse
sidebar_position: 50
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Đảo danh sách

<EmbedFlowNode type="action_list_reverse" />

> Đảo ngược thứ tự các phần tử trong một danh sách.

## Khi nào dùng

- Đảo thứ tự danh sách (mới nhất → cũ nhất hoặc ngược lại).
- Kết hợp với [Sắp xếp danh sách](/reference/blocks/actions/action_list_sort) để đổi chiều.

## Cấu hình

> `Danh sách` — danh sách đầu vào.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy danh sách đã đảo bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Sắp xếp danh sách](/reference/blocks/actions/action_list_sort)

<NodeInfoExplorer type="action_list_reverse" />
