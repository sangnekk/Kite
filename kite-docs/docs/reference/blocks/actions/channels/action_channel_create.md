---
slug: /reference/blocks/actions/action_channel_create
sidebar_position: 26
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tạo kênh

<EmbedFlowNode type="action_channel_create" />

> Tạo một kênh mới trong server.

## Khi nào dùng

- Tạo kênh riêng theo yêu cầu (ticket, phòng tạm).
- Tự thiết lập kênh khi cần.

## Cấu hình

> `Server` — server liên quan (thường là `{{ guild.id }}`).
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
- [Sửa kênh](/reference/blocks/actions/action_channel_edit)
- [Xóa kênh](/reference/blocks/actions/action_channel_delete)

<NodeInfoExplorer type="action_channel_create" />
