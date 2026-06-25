---
sidebar_position: 26
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chỉnh sửa kênh

<EmbedFlowNode type="action_channel_edit" />

> Chỉnh sửa một kênh hoặc luồng đã có.

## Khi nào dùng

- Đổi tên, chủ đề, quyền của kênh.
- Khoá/mở kênh theo flow.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).
>
> `Thông tin kênh` — tên, loại và thiết lập của kênh.
>
> `Lý do` — ghi chú hiển thị trong audit log của Discord.

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').id` | ID kênh |
| `result('id').name` | Tên kênh |
| `result('id').type` | Loại kênh |

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Tạo kênh](/reference/blocks/actions/action_channel_create)

<NodeInfoExplorer type="action_channel_edit" />
