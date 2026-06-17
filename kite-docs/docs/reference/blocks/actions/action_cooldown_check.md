---
sidebar_position: 43
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Kiểm tra cooldown

<EmbedFlowNode type="action_cooldown_check" />

Khối `Cooldown check` kiểm tra xem một người dùng có được phép thực hiện hành động lại hay chưa, dựa trên thời gian chờ. Dùng cho các lệnh như `/daily`, `/work` hoặc để chống spam. Cooldown được lưu (dưới dạng unix timestamp) trong một [biến lưu trữ](https://docs.kite.onl/reference/variable) có bật phạm vi.

### Cài đặt

> `Variable` Biến dùng để lưu thời điểm thực hiện gần nhất.
>
> `Phạm vi` Ai bị cooldown, mặc định `{{user.id}}`. Để trống nghĩa là cooldown toàn cục.
>
> `Thời gian chờ (giây)` Độ dài cooldown, ví dụ `86400` cho một ngày.
>
> `Chỉ kiểm tra` Nếu bật, chỉ kiểm tra mà không đặt lại mốc thời gian.

### Đầu ra
Kết quả là một đối tượng `{ allowed, remaining }`. Dùng khối `Điều kiện` để rẽ nhánh theo `allowed`.

<NodeInfoExplorer type="action_cooldown_check" />
