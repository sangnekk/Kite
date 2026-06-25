---
sidebar_position: 36
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Ghi log

<EmbedFlowNode type="action_log" />

> Ghi một dòng vào nhật ký ứng dụng (chỉ bạn thấy, để gỡ lỗi).

## Khi nào dùng

- Theo dõi giá trị khi gỡ lỗi flow.
- Ghi lại hoạt động để kiểm tra.

## Cấu hình

> `Mức độ` — mức log (info, warn, error...).
>
> `Nội dung` — nội dung ghi vào nhật ký ứng dụng.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lệnh tùy chỉnh](/reference/command)

<NodeInfoExplorer type="action_log" />
