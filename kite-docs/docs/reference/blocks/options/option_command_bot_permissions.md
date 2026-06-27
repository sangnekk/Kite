---
sidebar_position: 47
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Quyền lệnh (Bot)

<EmbedFlowNode type="option_command_bot_permissions" />

> Yêu cầu **bot** có các quyền Discord nhất định trong kênh thì lệnh mới chạy.

Khác với [Quyền lệnh](/reference/blocks/options/option_command_permissions) (kiểm tra quyền của **người dùng** và do Discord tự thực thi), khối này kiểm tra quyền của **chính bot** ngay trước khi flow chạy. Nếu bot thiếu quyền, bot sẽ nhắn cho người gọi lệnh (tin nhắn riêng tư — ephemeral) danh sách quyền còn thiếu rồi **dừng**, thay vì để các khối phía sau lỗi giữa chừng.

## Khi nào dùng

- Lệnh có hành động cần quyền cao (cấm/đuổi thành viên, quản lý kênh, xoá tin nhắn…) và bạn muốn báo lỗi rõ ràng khi bot bị thiếu quyền.
- Tránh phải dựng [Xử lý lỗi](/reference/blocks/controls/control_error_handler) chỉ để bắt lỗi "thiếu quyền".

## Cấu hình

> `Quyền bot cần có` — các quyền Discord mà bot phải có trong kênh để lệnh chạy. Chọn nhiều quyền tuỳ ý (ví dụ: Quản lý kênh, Cấm thành viên).

## Cách hoạt động

- Kiểm tra chạy **trong guild** ngay khi lệnh được gọi, trước khi flow thực thi. Trong tin nhắn riêng (DM) khối này được bỏ qua.
- Quyền được tính theo vai trò của bot **và** ghi đè quyền ở cấp kênh. Bot có quyền Quản trị viên (Administrator) luôn vượt qua.
- Nếu thiếu quyền: bot phản hồi danh sách quyền còn thiếu và dừng flow (không tính là lỗi).

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Quyền lệnh](/reference/blocks/options/option_command_permissions) — giới hạn theo quyền của người dùng.
- [Lệnh](/reference/blocks/entries/entry_command)
- [Xử lý lỗi](/reference/blocks/controls/control_error_handler)

<NodeInfoExplorer type="option_command_bot_permissions" />
