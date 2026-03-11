---
sidebar_position: 1
---

# Các khối

Mỗi flow trong Vibe Bot bao gồm nhiều khối được kết nối với nhau. Các khối được thực thi từ trên xuống dưới. Khi nhiều khối cùng nối vào một khối cha, thứ tự thực thi có thể không cố định.

Kết quả của các khối đã chạy trước đó có thể được dùng ở các khối phía sau thông qua biến `result(...)`. Nếu một khối gặp lỗi, quá trình thực thi sẽ dừng và các khối phía sau sẽ không chạy tiếp.

## Khối đầu vào

- [Lệnh](./entries/entry_command.md) - Điểm bắt đầu cho slash command
- [Lắng nghe sự kiện](./entries/entry_event.md) - Điểm bắt đầu cho luồng kích hoạt bởi sự kiện
- [Nút bấm](./entries/entry_component_button.md) - Điểm bắt đầu cho tương tác nút bấm

## Khối phản hồi

- [Tạo tin nhắn phản hồi](./actions/action_response_create.md) - Trả lời lệnh hoặc tương tác
- [Chỉnh sửa tin nhắn phản hồi](./actions/action_response_edit.md) - Chỉnh sửa phản hồi đã tạo
- [Xóa tin nhắn phản hồi](./actions/action_response_delete.md) - Xóa phản hồi
- [Hiển thị modal](./actions/suspend_response_modal.md) - Hiển thị hộp thoại modal cho người dùng
- [Trì hoãn phản hồi](./actions/action_response_defer.md) - Trì hoãn phản hồi để xử lý lâu hơn

## Khối tin nhắn

- [Tạo tin nhắn kênh](./actions/action_message_create.md) - Gửi tin nhắn vào kênh
- [Chỉnh sửa tin nhắn kênh](./actions/action_message_edit.md) - Chỉnh sửa tin nhắn trong kênh
- [Xóa tin nhắn kênh](./actions/action_message_delete.md) - Xóa tin nhắn trong kênh
- [Lấy tin nhắn kênh](./actions/action_message_get.md) - Lấy thông tin tin nhắn trong kênh
- [Gửi tin nhắn riêng](./actions/action_private_message_create.md) - Gửi tin nhắn riêng
- [Tạo reaction tin nhắn](./actions/action_message_reaction_create.md) - Thêm reaction cho tin nhắn
- [Xóa reaction tin nhắn](./actions/action_message_reaction_delete.md) - Xóa reaction khỏi tin nhắn

## Khối người dùng và thành viên

- [Lấy người dùng](./actions/action_user_get.md) - Lấy thông tin người dùng
- [Lấy thành viên](./actions/action_member_get.md) - Lấy thông tin thành viên server
- [Cấm thành viên](./actions/action_member_ban.md) - Cấm thành viên khỏi server
- [Gỡ cấm thành viên](./actions/action_member_unban.md) - Gỡ cấm thành viên
- [Đuổi thành viên](./actions/action_member_kick.md) - Đuổi thành viên khỏi server
- [Timeout member](./actions/action_member_timeout.md) - Timeout thành viên
- [Chỉnh sửa thành viên](./actions/action_member_edit.md) - Chỉnh sửa biệt danh thành viên
- [Thêm role cho thành viên](./actions/action_member_role_add.md) - Thêm role cho thành viên
- [Gỡ role khỏi thành viên](./actions/action_member_role_remove.md) - Gỡ role khỏi thành viên

## Khối server và kênh

- [Lấy role](./actions/action_role_get.md) - Lấy thông tin role
- [Lấy server](./actions/action_guild_get.md) - Lấy thông tin server
- [Lấy kênh](./actions/action_channel_get.md) - Lấy thông tin kênh

## Khối biến

- [Đặt biến lưu trữ](./actions/action_variable_set.md) - Đặt biến lưu trữ
- [Lấy biến lưu trữ](./actions/action_variable_get.md) - Lấy biến lưu trữ
- [Xóa biến lưu trữ](./actions/action_variable_delete.md) - Xóa biến lưu trữ

## Khối AI

- [Hỏi AI](./actions/action_ai_chat_completion.md) - Tương tác với mô hình AI
- [Tìm kiếm web](./actions/action_ai_web_search.md) - Tìm kiếm trên internet bằng AI

## Khối tiện ích

- [Tính biểu thức](./actions/action_expression_evaluate.md) - Tính toán biểu thức và giá trị
- [Tạo số ngẫu nhiên](./actions/action_random_generate.md) - Tạo số ngẫu nhiên
- [Gửi yêu cầu API](./actions/action_http_request.md) - Gửi HTTP request
- [Ghi log](./actions/action_log.md) - Ghi log phục vụ debug

## Khối Roblox

- [Lấy người dùng Roblox](./actions/action_roblox_user_get.md) - Lấy thông tin người dùng Roblox

## Khối điều khiển luồng

- [Điều kiện so sánh](./controls/control_condition_compare.md) - Tạo điều kiện so sánh
- [Điều kiện người dùng](./controls/control_condition_user.md) - Điều kiện theo người dùng
- [Điều kiện kênh](./controls/control_condition_channel.md) - Điều kiện theo kênh
- [Điều kiện role](./controls/control_condition_role.md) - Điều kiện theo role
- [Vòng lặp](./controls/control_loop.md) - Chạy hành động lặp lại nhiều lần
- [Thoát vòng lặp](./controls/control_loop_exit.md) - Thoát vòng lặp sớm
- [Chờ](./controls/control_sleep.md) - Tạm dừng thực thi flow

## Tùy chọn lệnh

- [Đối số lệnh](./options/option_command_argument.md) - Khai báo đối số lệnh
- [Quyền lệnh](./options/option_command_permissions.md) - Thiết lập quyền lệnh
- [Bối cảnh lệnh](./options/option_command_contexts.md) - Xác định phạm vi khả dụng của lệnh

## Tùy chọn sự kiện

- [Bộ lọc sự kiện](./options/option_event_filter.md) - Lọc sự kiện theo thuộc tính
