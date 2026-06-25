---
sidebar_position: 3
---

# Bộ lắng nghe sự kiện

Với bộ lắng nghe sự kiện, bạn có thể theo dõi các sự kiện diễn ra trong server Discord mà bot của bạn tham gia. Hiện tại Vibe Bot hỗ trợ các sự kiện sau:

### Tin nhắn

| Sự kiện | Mô tả |
|---|---|
| Message Create | Tin nhắn mới được gửi trong kênh |
| Message Update | Tin nhắn được chỉnh sửa |
| Message Delete | Một tin nhắn bị xóa |
| Message Delete Bulk | Nhiều tin nhắn bị xóa cùng lúc (ví dụ: dùng lệnh purge) |

### Reaction

| Sự kiện | Mô tả |
|---|---|
| Message Reaction Add | Thành viên thêm reaction vào tin nhắn |
| Message Reaction Remove | Thành viên gỡ reaction khỏi tin nhắn |
| Message Reaction Remove All | Tất cả reaction trên một tin nhắn bị xóa |

### Thành viên

| Sự kiện | Mô tả |
|---|---|
| Member Join | Thành viên mới tham gia server |
| Member Leave | Thành viên rời server |
| Guild Ban Add | Thành viên bị ban khỏi server |
| Guild Ban Remove | Lệnh ban của thành viên được gỡ |

### Kênh & Voice

| Sự kiện | Mô tả |
|---|---|
| Channel Create | Kênh mới được tạo trong server |
| Channel Delete | Kênh bị xóa khỏi server |
| Voice State Update | Thành viên tham gia, rời hoặc chuyển kênh voice |

## Giới hạn

- Bạn chỉ có thể tạo tối đa 5 bộ lắng nghe sự kiện cho mỗi ứng dụng.
- Vibe Bot sẽ bỏ qua các tin nhắn được gửi bởi bot (áp dụng cho Message Create và Message Update).
- Sự kiện **Member Join** và **Member Leave** chỉ khả dụng khi bạn bật **Server Members Intent** trong [Discord Developer Portal](https://discord.dev).

![Ví dụ luồng sự kiện](./img/example-event-flow.png)
