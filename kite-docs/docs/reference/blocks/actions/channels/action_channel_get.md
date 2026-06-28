---
slug: /reference/blocks/actions/action_channel_get
sidebar_position: 26
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lấy kênh

<EmbedFlowNode type="action_channel_get" />

> Đọc thông tin một kênh theo ID.

## Khi nào dùng

- Lấy tên/loại kênh.
- Kiểm tra kênh trước khi gửi hoặc sửa.

## Cấu hình

> `Kênh` — kênh đích (ID hoặc biểu thức như `{{ channel.id }}`).

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
- [Điều kiện kênh](/reference/blocks/controls/control_condition_channel)

<NodeInfoExplorer type="action_channel_get" />
