---
sidebar_position: 1
---

# Các khối

**Khối (block)** là viên gạch nhỏ nhất để dựng nên một flow. Bạn kéo–thả các khối rồi nối chúng lại với nhau; khi flow được kích hoạt, các khối sẽ **chạy lần lượt từ trên xuống dưới**.

Trang này là **bản đồ để chọn khối**: trước tiên hiểu vài quy tắc chung, sau đó tìm đúng nhóm khối cho việc bạn cần làm.

## Ba quy tắc cần nhớ

1. **Thứ tự chạy** — các khối chạy từ trên xuống. Khi nhiều khối cùng nối vào một khối cha, thứ tự giữa chúng có thể không cố định.
2. **Dùng lại kết quả** — kết quả của khối chạy trước được lấy ở khối sau bằng biểu thức `result('id')`. Mỗi khối có một `id`; xem [Biểu thức](/reference/expressions) để biết cách tham chiếu.
3. **Lỗi sẽ dừng flow** — nếu một khối gặp lỗi, các khối phía sau sẽ không chạy. Dùng [Xử lý lỗi](./controls/control_error_handler.md) khi bạn muốn flow tiếp tục dù có lỗi.

## Chọn khối theo nhu cầu

Mỗi flow luôn bắt đầu bằng **một khối đầu vào** (điểm vào), sau đó bạn ghép thêm các **khối hành động** và **khối điều khiển** để tạo logic:

- Cần **khởi động** flow? → [Khối đầu vào](#khối-đầu-vào)
- Cần **trả lời** một lệnh / tương tác? → [Khối phản hồi](#khối-phản-hồi)
- Cần **gửi hoặc sửa tin nhắn** trong kênh? → [Khối tin nhắn](#khối-tin-nhắn)
- Cần **quản lý thành viên / role / server**? → [Người dùng & thành viên](#khối-người-dùng-và-thành-viên), [Server & kênh](#khối-server-và-kênh)
- Cần **lưu và lấy lại dữ liệu**? → [Khối biến](#khối-biến)
- Cần **rẽ nhánh, lặp, chờ**? → [Khối điều khiển luồng](#khối-điều-khiển-luồng)
- Cần **AI, gọi API, xử lý văn bản/số/danh sách**? → [Khối AI](#khối-ai), [Khối tiện ích](#khối-tiện-ích), [Danh sách & JSON](#khối-danh-sách-và-json)
- Cần **hệ thống điểm / tiền tệ**? → [Khối kinh tế](#khối-kinh-tế)

:::tip
Mỗi khối hành động tiêu tốn [credit](/reference/credit-system) khi chạy. Hãy đặt các điều kiện hợp lý để chỉ chạy khi thật sự cần.
:::

---

## Khối đầu vào

> **Bắt đầu một flow.** Mỗi flow cần đúng một khối đầu vào để xác định điều gì kích hoạt nó.

- [Lệnh](./entries/entry_command.md) - Điểm bắt đầu cho slash command
- [Lắng nghe sự kiện](./entries/entry_event.md) - Điểm bắt đầu cho luồng kích hoạt bởi sự kiện
- [Nút bấm](./entries/entry_component_button.md) - Điểm bắt đầu cho tương tác nút bấm

## Khối phản hồi

> **Trả lời trực tiếp một lệnh hoặc tương tác.** Đây thường là khối đầu tiên sau khối đầu vào để cho người dùng thấy phản hồi.

- [Tạo tin nhắn phản hồi](./actions/action_response_create.md) - Trả lời lệnh hoặc tương tác
- [Chỉnh sửa tin nhắn phản hồi](./actions/action_response_edit.md) - Chỉnh sửa phản hồi đã tạo
- [Xóa tin nhắn phản hồi](./actions/action_response_delete.md) - Xóa phản hồi
- [Hiển thị modal](./actions/suspend_response_modal.md) - Hiển thị hộp thoại modal cho người dùng
- [Trì hoãn phản hồi](./actions/action_response_defer.md) - Trì hoãn phản hồi để xử lý lâu hơn

## Khối tin nhắn

> **Gửi, sửa, xóa tin nhắn trong kênh** (khác với phản hồi: tin nhắn không gắn với một lệnh cụ thể).

- [Tạo tin nhắn kênh](./actions/action_message_create.md) - Gửi tin nhắn vào kênh
- [Chỉnh sửa tin nhắn kênh](./actions/action_message_edit.md) - Chỉnh sửa tin nhắn trong kênh
- [Xóa tin nhắn kênh](./actions/action_message_delete.md) - Xóa tin nhắn trong kênh
- [Lấy tin nhắn kênh](./actions/action_message_get.md) - Lấy thông tin tin nhắn trong kênh
- [Gửi tin nhắn riêng](./actions/action_private_message_create.md) - Gửi tin nhắn riêng
- [Tạo reaction tin nhắn](./actions/action_message_reaction_create.md) - Thêm reaction cho tin nhắn
- [Xóa reaction tin nhắn](./actions/action_message_reaction_delete.md) - Xóa reaction khỏi tin nhắn

## Khối người dùng và thành viên

> **Đọc thông tin và quản lý thành viên** trong server: cấm, đuổi, timeout, gán role...

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

> **Đọc thông tin về server, kênh và role** để dùng trong các bước sau.

- [Lấy role](./actions/action_role_get.md) - Lấy thông tin role
- [Lấy server](./actions/action_guild_get.md) - Lấy thông tin server
- [Lấy kênh](./actions/action_channel_get.md) - Lấy thông tin kênh

## Khối biến

> **Lưu và lấy lại dữ liệu** tồn tại giữa các lần chạy flow. Xem [Biến lưu trữ](/reference/variable) để hiểu phạm vi (scope).

- [Đặt biến lưu trữ](./actions/action_variable_set.md) - Đặt biến lưu trữ
- [Lấy biến lưu trữ](./actions/action_variable_get.md) - Lấy biến lưu trữ
- [Xóa biến lưu trữ](./actions/action_variable_delete.md) - Xóa biến lưu trữ

## Khối AI

> **Dùng trí tuệ nhân tạo** để sinh văn bản hoặc tìm kiếm thông tin. Lưu ý các khối này tốn nhiều credit hơn.

- [Hỏi AI](./actions/action_ai_chat_completion.md) - Tương tác với mô hình AI
- [Tìm kiếm web](./actions/action_ai_web_search.md) - Tìm kiếm trên internet bằng AI

## Khối tiện ích

> **Công cụ xử lý dữ liệu chung**: tính biểu thức, gọi API, biến đổi văn bản/số, lấy thời gian.

- [Tính biểu thức](./actions/action_expression_evaluate.md) - Tính toán biểu thức và giá trị
- [Tạo số ngẫu nhiên](./actions/action_random_generate.md) - Tạo số ngẫu nhiên
- [Gửi yêu cầu API](./actions/action_http_request.md) - Gửi HTTP request
- [Lấy thời gian hiện tại](./actions/action_time_now.md) - Lấy thời gian hiện tại theo định dạng
- [Biến đổi văn bản](./actions/action_text_transform.md) - Hoa/thường, cắt, thay thế, tách văn bản
- [Định dạng số](./actions/action_number_format.md) - Dấu phẩy nghìn, rút gọn K/M, thập phân
- [Ghi log](./actions/action_log.md) - Ghi log phục vụ debug

## Khối danh sách và JSON

> **Làm việc với danh sách và dữ liệu JSON**: chọn, nối, đếm, phân tích và tạo JSON.

- [Chọn ngẫu nhiên từ danh sách](./actions/action_list_pick.md) - Chọn ngẫu nhiên một phần tử
- [Định dạng danh sách](./actions/action_list_format.md) - Render mỗi phần tử theo mẫu rồi nối lại
- [Nối danh sách](./actions/action_list_join.md) - Nối các phần tử thành chuỗi
- [Độ dài danh sách](./actions/action_list_length.md) - Đếm số phần tử
- [Phân tích JSON](./actions/action_json_parse.md) - Chuỗi JSON thành đối tượng
- [Tạo JSON](./actions/action_json_build.md) - Giá trị thành chuỗi JSON

## Khối kinh tế

> **Dựng hệ thống điểm / tiền tệ**: số dư, chuyển tiền, bảng xếp hạng, cooldown cho lệnh kiểu `/daily`.

- [Xem số dư](./actions/action_balance_get.md) - Lấy số dư của một người dùng
- [Cộng số dư](./actions/action_balance_add.md) - Cộng tiền vào số dư
- [Trừ số dư](./actions/action_balance_remove.md) - Trừ tiền khỏi số dư
- [Đặt số dư](./actions/action_balance_set.md) - Đặt số dư thành giá trị cố định
- [Chuyển tiền](./actions/action_balance_transfer.md) - Chuyển tiền giữa hai người dùng
- [Bảng xếp hạng số dư](./actions/action_balance_leaderboard.md) - Người có số dư cao nhất
- [Kiểm tra cooldown](./actions/action_cooldown_check.md) - Thời gian chờ cho lệnh (vd /daily)

## Khối điều khiển luồng

> **Tạo logic cho flow**: rẽ nhánh theo điều kiện, lặp lại, tạm dừng. Các khối này **không tốn credit**.

- [Điều kiện so sánh](./controls/control_condition_compare.md) - Tạo điều kiện so sánh
- [Điều kiện người dùng](./controls/control_condition_user.md) - Điều kiện theo người dùng
- [Điều kiện kênh](./controls/control_condition_channel.md) - Điều kiện theo kênh
- [Điều kiện role](./controls/control_condition_role.md) - Điều kiện theo role
- [Vòng lặp](./controls/control_loop.md) - Chạy hành động lặp lại nhiều lần
- [Thoát vòng lặp](./controls/control_loop_exit.md) - Thoát vòng lặp sớm
- [Chờ](./controls/control_sleep.md) - Tạm dừng thực thi flow
- [Xử lý lỗi](./controls/control_error_handler.md) - Tiếp tục flow ngay cả khi một khối lỗi

## Tùy chọn lệnh

> **Tinh chỉnh hành vi của một lệnh**: khai báo đối số, đặt quyền, giới hạn bối cảnh sử dụng.

- [Đối số lệnh](./options/option_command_argument.md) - Khai báo đối số lệnh
- [Quyền lệnh](./options/option_command_permissions.md) - Thiết lập quyền lệnh
- [Bối cảnh lệnh](./options/option_command_contexts.md) - Xác định phạm vi khả dụng của lệnh

## Tùy chọn sự kiện

> **Lọc khi nào một bộ lắng nghe sự kiện được kích hoạt.**

- [Bộ lọc sự kiện](./options/option_event_filter.md) - Lọc sự kiện theo thuộc tính
