---
slug: /reference/blocks/actions/action_transcript
sidebar_position: 13
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Lưu transcript

<EmbedFlowNode type="action_transcript" />

> Lưu lịch sử chat gần nhất của một kênh hoặc thread thành tệp HTML hoặc văn bản, và có thể gửi tệp đó vào một kênh khác.

## Khi nào dùng

- Lưu lại nội dung ticket trước khi đóng kênh hỗ trợ.
- Lưu bằng chứng của một cuộc tranh chấp hoặc báo cáo vi phạm.
- Gửi bản sao cuộc trò chuyện vào kênh log của đội ngũ.

## Cấu hình

> `Kênh mục tiêu` — kênh hoặc thread cần lưu. Để trống để dùng kênh của sự kiện đang chạy.

> `Số tin nhắn` — số tin gần nhất cần lưu. Mặc định 100, tối đa 1000.

> `Định dạng` — `HTML` (mở bằng trình duyệt, có avatar, ảnh xem trước và embed), `Văn bản thuần` (`.txt`), hoặc `Cả hai` để tạo đồng thời một tệp `.html` và một tệp `.txt`.

> `Tên transcript` — tùy chọn, dùng làm tên tệp và tiêu đề trang HTML. Để trống sẽ tự đặt theo kênh và giờ. Ký tự đặc biệt được đổi thành dấu gạch ngang, ví dụ `Ticket #42` thành `Ticket-42.html`.

> `Chỉ tin cũ hơn tin nhắn` / `Chỉ tin mới hơn tin nhắn` — ID tin nhắn dùng làm mốc, tùy chọn. Ví dụ đặt mốc "mới hơn" là tin mở ticket để chỉ lưu từ lúc mở.

> `Bỏ tin nhắn của bot` — bật để không đưa tin của bot vào transcript.

> `Gửi tệp vào kênh` — để trống nếu chỉ muốn dùng kết quả ở các khối sau. Nếu điền, bot upload tệp vào kênh này. Tệp lớn hơn 8 MB không gửi được, hãy giảm số tin nhắn.

## Kết quả trả về

Đặt một `id` cho khối rồi tham chiếu kết quả ở các bước sau (thay `id` bằng ID của khối):

| Trường | Ý nghĩa |
| --- | --- |
| `result('id').count` | Số tin nhắn trong transcript |
| `result('id').channel_id` | ID kênh đã lưu |
| `result('id').file_name` | Tên tệp, ví dụ `transcript-123-20261101-120000.html` |
| `result('id').content` | Toàn bộ nội dung tệp dưới dạng văn bản (với `Cả hai` là tệp HTML) |
| `result('id').text_file_name` | Tên tệp văn bản, chỉ có khi chọn `Cả hai` |
| `result('id').text_content` | Nội dung tệp văn bản, chỉ có khi chọn `Cả hai` |
| `result('id').warning` | Cảnh báo, rỗng nếu không có vấn đề |

## Lưu ý & liên quan

- Bot cần quyền **Xem kênh** và **Đọc lịch sử tin nhắn** trong kênh cần lưu.
- Cần bật **Message Content Intent** cho ứng dụng bot trong Discord Developer Portal. Nếu không, Discord gửi tin nhắn với nội dung trống, khi đó `warning` sẽ báo và transcript chỉ có tên và giờ.
- Transcript chứa tin nhắn của thành viên. Hãy thông báo cho thành viên và đừng gửi tệp vào kênh công khai.
- Tệp HTML đã được escape, không chứa script, nên mở được an toàn. Ảnh đính kèm và ảnh trong embed được hiển thị trực tiếp (cần mạng để tải ảnh), các tệp khác hiện dưới dạng liên kết. Chỉ liên kết `http` và `https` được giữ lại.
- Góc dưới bên trái của tệp HTML có nhãn "Tạo bởi Vibe Bot". Nhãn chỉ được ẩn khi ứng dụng có gói được bật tính năng "Ẩn watermark transcript"; mặc định không gói nào có.
- Tốn **3 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Lấy tin nhắn kênh](/reference/blocks/actions/action_message_get)
- [Tạo tin nhắn kênh](/reference/blocks/actions/action_message_create)

<NodeInfoExplorer type="action_transcript" />
