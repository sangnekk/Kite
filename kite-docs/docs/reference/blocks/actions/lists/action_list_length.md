---
slug: /reference/blocks/actions/action_list_length
sidebar_position: 50
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Độ dài danh sách

<EmbedFlowNode type="action_list_length" />

> Đếm số phần tử trong một danh sách.

## Khi nào dùng

- Kiểm tra danh sách có bao nhiêu phần tử trước khi xử lý.
- Hiển thị số lượng.

## Cấu hình

> `Danh sách` — danh sách đầu vào.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy số lượng bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Nối danh sách](/reference/blocks/actions/action_list_join)

<NodeInfoExplorer type="action_list_length" />
