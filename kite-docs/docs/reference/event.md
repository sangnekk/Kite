---
sidebar_position: 3
---

# Bộ lắng nghe sự kiện

Bộ lắng nghe sự kiện cho phép bot của bạn tự động phản hồi các hoạt động diễn ra trong server Discord — chẳng hạn khi có tin nhắn mới, khi thành viên tham gia, hoặc khi có ai đó thêm reaction.

Mỗi bộ lắng nghe sự kiện là một flow độc lập. Khi sự kiện bạn chọn xảy ra, flow sẽ được kích hoạt và thực thi tự động.

![Ví dụ luồng sự kiện](./img/example-event-flow.png)

## Tạo bộ lắng nghe sự kiện

1. Bấm biểu tượng **sự kiện** trên thanh bên trái của bảng điều khiển
2. Bấm **Create event listener**
3. Chọn loại sự kiện bạn muốn theo dõi
4. Trong trình soạn thảo, kéo các khối hành động và nối chúng với khối **Listen for Event**
5. Lưu lại bằng cách bấm **Save Changes**
6. Bật bộ lắng nghe bằng công tắc ở góc phải

:::tip

Bạn có thể dùng khối **Event Filter** để giới hạn khi nào flow được kích hoạt. Ví dụ: chỉ phản hồi tin nhắn ở một kênh nhất định, hoặc chỉ xử lý reaction từ một emoji cụ thể.

:::

## Sự kiện được hỗ trợ

### Tin nhắn

#### Message Create

Kích hoạt mỗi khi có tin nhắn mới được gửi vào một kênh mà bot có quyền đọc. Đây là sự kiện phổ biến nhất, thường dùng để tạo hệ thống lọc từ ngữ, tự động phản hồi, hoặc ghi log hoạt động.

:::info

Vibe Bot **bỏ qua** tin nhắn được gửi bởi bot (bao gồm chính bot của bạn) để tránh vòng lặp vô tận.

:::

#### Message Update

Kích hoạt khi một tin nhắn bị chỉnh sửa. Hữu ích khi bạn muốn ghi log lịch sử chỉnh sửa hoặc kiểm tra nội dung sau khi sửa.

#### Message Delete

Kích hoạt khi một tin nhắn bị xóa (xóa đơn lẻ). Thường dùng để ghi log vào kênh kiểm duyệt.

#### Message Delete Bulk

Kích hoạt khi nhiều tin nhắn bị xóa cùng lúc, ví dụ khi dùng lệnh purge hoặc xóa hàng loạt. Khác với Message Delete, sự kiện này cung cấp danh sách các ID tin nhắn bị xóa thay vì từng tin nhắn riêng lẻ.

### Reaction

#### Message Reaction Add

Kích hoạt khi thành viên thêm reaction vào bất kỳ tin nhắn nào trong server. Thường dùng để xây dựng hệ thống role bằng reaction, bình chọn, hoặc phản hồi tương tác.

#### Message Reaction Remove

Kích hoạt khi thành viên gỡ reaction khỏi tin nhắn. Thường đi kèm với **Message Reaction Add** để xử lý việc gán và thu hồi role.

#### Message Reaction Remove All

Kích hoạt khi toàn bộ reaction trên một tin nhắn bị xóa cùng lúc (thường do moderator thực hiện).

### Thành viên

#### Member Join

Kích hoạt khi có thành viên mới tham gia server. Thường dùng để gửi tin nhắn chào mừng, tự động gán role mặc định, hoặc ghi log.

#### Member Leave

Kích hoạt khi thành viên rời server (tự rời hoặc bị kick). Thường dùng để gửi thông báo tạm biệt hoặc ghi log.

:::warning

Sự kiện **Member Join** và **Member Leave** yêu cầu bật **Server Members Intent** trong [Discord Developer Portal](https://discord.com/developers/applications).

Bật theo hướng dẫn: mở ứng dụng Discord → chọn mục **Bot** → kéo xuống phần **Privileged Gateway Intents** → bật **Server Members Intent**.

:::

#### Guild Ban Add

Kích hoạt khi một thành viên bị ban khỏi server. Hữu ích để ghi log hoặc thông báo cho đội kiểm duyệt.

#### Guild Ban Remove

Kích hoạt khi lệnh ban của một thành viên được gỡ. Thường dùng kết hợp với **Guild Ban Add** để theo dõi lịch sử ban/unban.

### Kênh & Voice

#### Channel Create

Kích hoạt khi một kênh mới được tạo trong server (kênh text, voice, hoặc category). Có thể dùng để tự động thiết lập quyền hạn hoặc thông báo cho thành viên.

#### Channel Delete

Kích hoạt khi một kênh bị xóa khỏi server.

#### Voice State Update

Kích hoạt khi thành viên thay đổi trạng thái voice: tham gia kênh voice, rời kênh, chuyển kênh, tắt/bật micro hoặc camera. Thường dùng để theo dõi hoạt động voice, tự động tạo kênh tạm, hoặc ghi log thời gian online.

## Bộ lọc sự kiện

Mặc định, bộ lắng nghe sẽ kích hoạt với **mọi** sự kiện thuộc loại đó trong toàn server. Bạn có thể dùng khối **Event Filter** để thu hẹp phạm vi — ví dụ:

- Chỉ lắng nghe tin nhắn ở một kênh cụ thể
- Chỉ xử lý reaction từ một user nhất định
- Chỉ phản hồi khi nội dung tin nhắn chứa từ khóa nào đó

Xem thêm tại [Bộ lọc sự kiện](./blocks/options/option_event_filter.md).

## Giới hạn

- Bạn chỉ có thể tạo tối đa **5 bộ lắng nghe sự kiện** cho mỗi ứng dụng.
- Vibe Bot bỏ qua tin nhắn từ bot cho sự kiện **Message Create** và **Message Update**.
- **Member Join** và **Member Leave** yêu cầu **Server Members Intent** (xem ở trên).
