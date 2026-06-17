---
sidebar_position: 44
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Lấy thời gian hiện tại

<EmbedFlowNode type="action_time_now" />

Khối `Current time` trả về thời gian hiện tại theo định dạng đã chọn.

### Cài đặt

> `Định dạng` Kiểu trả về: `unix` (giây), `unix_ms` (mili giây), `iso` (ISO 8601), `date`, `time`, `datetime`, hoặc một layout Go tùy chỉnh.
>
> `Múi giờ` Tên múi giờ IANA (ví dụ `Asia/Ho_Chi_Minh`), để trống là UTC.

### Đầu ra
Định dạng `unix` rất hợp để so sánh thời gian (ví dụ với khối Cooldown).

<NodeInfoExplorer type="action_time_now" />
