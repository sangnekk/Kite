---
sidebar_position: 26
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo thread

<EmbedFlowNode type="action_thread_create" />

> Tạo một luồng (thread) mới.

## Khi nào dùng

- Mở luồng thảo luận riêng cho một chủ đề.
- Tạo luồng ticket cho từng người dùng.

## Cấu hình

> `Thông tin luồng` — tên và thiết lập của luồng.
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
- [Thêm thành viên vào luồng](/reference/blocks/actions/action_thread_member_add)

<NodeInfoExplorer type="action_thread_create" />
