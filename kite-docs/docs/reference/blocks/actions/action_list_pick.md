---
sidebar_position: 47
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chọn ngẫu nhiên từ danh sách

<EmbedFlowNode type="action_list_pick" />

> Chọn ngẫu nhiên một phần tử từ danh sách.

## Khi nào dùng

- Bốc thăm, chọn người thắng ngẫu nhiên.
- Trả lời ngẫu nhiên từ danh sách câu sẵn.

## Cấu hình

> `Danh sách` — danh sách để chọn ngẫu nhiên.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy phần tử được chọn bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo số ngẫu nhiên](/reference/blocks/actions/action_random_generate)

<NodeInfoExplorer type="action_list_pick" />
