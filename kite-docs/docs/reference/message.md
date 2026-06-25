---
sidebar_position: 2
---

# Mẫu tin nhắn

Mẫu tin nhắn là cách tốt nhất để tạo ra các tin nhắn Discord được tùy chỉnh hoàn toàn theo ý muốn. Sau khi tạo, bạn có thể gửi mẫu tin nhắn trực tiếp vào kênh Discord hoặc dùng làm phản hồi cho lệnh và sự kiện.

Mẫu tin nhắn hỗ trợ đầy đủ tính năng embed của Discord, đính kèm tệp, và các thành phần tương tác.

Mẫu tin nhắn là **tài nguyên dùng chung** (xem [lược đồ tổng thể](/)): tạo một lần, dùng lại ở bất kỳ flow nào — làm phản hồi cho [lệnh](/reference/command), nội dung gửi khi có [sự kiện](/reference/event), hoặc gửi thủ công vào kênh.

![Ví dụ tin nhắn](./img/example-message.png)

## Thành phần tương tác

Bạn có thể thêm các thành phần tương tác như nút bấm vào tin nhắn để người dùng tương tác. Khi người dùng bấm nút, flow tiếp tục theo nhánh tương ứng — đây chính là một [sub-flow](/reference/sub-flows).

![Ví dụ tin nhắn với nút bấm](./img/example-component.png)

## Liên quan

- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create) — gửi mẫu tin nhắn vào một kênh
- [Tạo tin nhắn phản hồi](/reference/blocks/actions/action_response_create) — dùng mẫu làm phản hồi cho lệnh
- [Sub-flow](/reference/sub-flows) — cách nút bấm và modal kéo dài flow
- [Bắt đầu nhanh](/guides/getting-started) — tạo mẫu tin nhắn đầu tiên
