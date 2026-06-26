---
sidebar_position: 3
---

# Bộ lắng nghe sự kiện

Bộ lắng nghe sự kiện cho phép bot của bạn tự động phản hồi các hoạt động diễn ra trong server Discord — chẳng hạn khi có tin nhắn mới, khi thành viên tham gia, hoặc khi có ai đó thêm reaction.

Mỗi bộ lắng nghe sự kiện là một flow độc lập. Khi sự kiện bạn chọn xảy ra, flow sẽ được kích hoạt và thực thi tự động.

Sự kiện là **điểm vào** thứ hai để khởi động flow, bên cạnh [lệnh](/reference/command) (xem [lược đồ tổng thể](/)). Khác với lệnh do người dùng chủ động gọi, sự kiện được kích hoạt tự động bởi hoạt động trong server hoặc từ các dịch vụ bên ngoài qua webhook.

Kite hỗ trợ hai **nguồn sự kiện**:
- **Discord** — hoạt động xảy ra trong server Discord (tin nhắn, thành viên, reaction, voice...)
- **Webhook** — sự kiện từ dịch vụ bên ngoài như SePay, ThueAPIBank, hoặc bất kỳ dịch vụ nào hỗ trợ webhook (xem [Tích hợp Webhook](/reference/integration))

![Ví dụ luồng sự kiện](./img/example-event-flow.png)

## Tạo bộ lắng nghe sự kiện

1. Bấm biểu tượng **sự kiện** trên thanh bên trái của bảng điều khiển
2. Bấm **Tạo bộ lắng nghe**
3. Chọn **Nguồn**: `Discord` hoặc một trong các tích hợp webhook (SePay, ThueAPIBank, Webhook tùy chỉnh)
4. Với nguồn Discord: chọn loại sự kiện cụ thể (Message Create, Member Join...)
5. Trong trình soạn thảo, kéo các khối hành động và nối chúng với khối **Lắng nghe sự kiện**
6. Lưu lại bằng cách bấm **Save Changes**
7. Bật bộ lắng nghe bằng công tắc ở góc phải

:::note

Để dùng nguồn webhook (SePay, ThueAPIBank, Custom), bạn phải **bật tích hợp tương ứng trước** tại trang **Tích hợp**. Xem hướng dẫn tại [Tích hợp Webhook](/reference/integration).

:::

:::tip

Bạn có thể dùng khối **Event Filter** để giới hạn khi nào flow được kích hoạt. Ví dụ: chỉ phản hồi tin nhắn ở một kênh nhất định, hoặc chỉ xử lý reaction từ một emoji cụ thể.

:::

## Dữ liệu của sự kiện

Khối **Lắng nghe sự kiện** *không* tạo ra `result()` như các khối hành động. Thay vào đó, mỗi khi sự kiện kích hoạt, flow nhận dữ liệu qua các **placeholder** dùng trong [biểu thức](/reference/expressions) `{{ }}`.

### Sự kiện Discord

| Placeholder | Trường khả dụng |
| --- | --- |
| `user` / `member` | `id`, `username`, `display_name`, `mention`, `avatar_url`, `banner_url`. `member` có thêm `nick`, `role_ids` |
| `message` | `id`, `content` |
| `channel` | `id`, `mention`, và `name` (với sự kiện kênh) |
| `guild` (hoặc `server`) | `id` |
| `event.emoji` | `id`, `name`, `animated` — *sự kiện reaction* |
| `event.message_ids` | danh sách ID tin nhắn bị xóa — *sự kiện xóa hàng loạt* |
| `event.voice` | `channel_id`, `mute`, `deaf`, `self_mute`, `self_deaf`, `self_stream`, `self_video`, `suppress` — *sự kiện voice* |
| `app` | bot của bạn — `app.user.id`, `app.user.mention` |

Mỗi loại sự kiện chỉ cung cấp một phần trong số trên. Bảng dưới cho biết placeholder nào khả dụng theo từng loại:

| Sự kiện | `user`/`member` | `message` | `channel` | `guild` | Khác |
| --- | :---: | :---: | :---: | :---: | --- |
| Message Create / Update | ✅ | ✅ | ✅ | ✅ | |
| Message Delete | — | ✅ (chỉ `id`) | ✅ | ✅ | |
| Message Delete Bulk | — | — | ✅ | ✅ | `event.message_ids` |
| Message Reaction Add | ✅¹ | ✅ (chỉ `id`) | ✅ | ✅ | `event.emoji` |
| Message Reaction Remove | ✅² | ✅ (chỉ `id`) | ✅ | ✅ | `event.emoji` |
| Message Reaction Remove All | — | ✅ (chỉ `id`) | ✅ | ✅ | |
| Member Join | ✅ (có `nick`, `role_ids`) | — | — | ✅ | |
| Member Leave | ✅ | — | — | ✅ | |
| Guild Ban Add / Remove | ✅ | — | — | ✅ | |
| Channel Create / Delete | — | — | ✅ (có `name`) | ✅ | |
| Voice State Update | ✅² | — | ✅ (kênh voice) | ✅ | `event.voice` |

¹ Trong server, `user` là một `member` đầy đủ (có `nick`, `role_ids`).
² Chỉ có `id` và `mention` — Discord không gửi kèm tên/avatar. Cần thêm? Truyền `user.id` vào khối [Lấy thành viên](/reference/blocks/actions/action_member_get).

:::note
- `channel` chỉ có `name` với **Channel Create / Delete**. Ở các sự kiện khác, `channel` chỉ có `id` + `mention` — để lấy tên, truyền `channel.id` vào khối [Lấy kênh](/reference/blocks/actions/action_channel_get). `guild` luôn chỉ có `id`.
- Discord **không gửi** trạng thái voice *trước đó* — `event.voice` là trạng thái *mới* sau thay đổi. Không có "before" như một số thư viện khác (chúng tự cache mới có).
:::

### Sự kiện Webhook

Với các sự kiện từ tích hợp webhook (SePay, ThueAPIBank, Custom Webhook), toàn bộ JSON payload từ dịch vụ bên ngoài được truyền vào `event.data`:

| Placeholder | Mô tả |
| --- | --- |
| `event.data` | Toàn bộ JSON payload từ dịch vụ webhook |
| `event.data.{field}` | Bất kỳ trường nào trong payload — tùy theo dịch vụ |
| `app` | Bot của bạn — `app.user.id`, `app.user.mention` |

Không có `user`, `message`, `channel`, `guild` trong webhook event. Cấu trúc `event.data` phụ thuộc vào dịch vụ gửi webhook — xem ví dụ và danh sách trường tại [Tích hợp Webhook](/reference/integration#ví-dụ-với-sepay).

### Ví dụ truy cập dữ liệu

| Sự kiện | Biểu thức |
| --- | --- |
| Message Create | `{{ user.mention }}`, `{{ message.content }}`, `{{ channel.id }}` |
| Reaction Add | `{{ user.mention }} đã thả {{ event.emoji.name }} vào tin nhắn {{ message.id }}` |
| Member Join | `Chào mừng {{ user.mention }}!` |
| Guild Ban Add | `{{ user.username }} đã bị cấm` |
| Voice State Update | `{{ user.mention }} đang ở kênh voice {{ event.voice.channel_id }}` |
| Message Delete Bulk | `Đã xóa {{ len(event.message_ids) }} tin nhắn` |
| SePay (webhook) | `Nhận {{ event.data.transferAmount }}đ từ {{ event.data.gateway }}` |
| Custom Webhook | `{{ event.data.order_id }}` |

## Sự kiện được hỗ trợ

### Webhook

#### SePay

Kích hoạt khi có giao dịch ngân hàng mới được SePay ghi nhận và gửi về webhook URL của bạn. Thường dùng để tự động xác nhận thanh toán, gửi thông báo, hoặc kích hoạt luồng xử lý đơn hàng.

Dữ liệu truy cập qua `event.data` — xem ví dụ đầy đủ tại [Tích hợp Webhook](/reference/integration#ví-dụ-với-sepay).

Yêu cầu: bật tích hợp SePay tại trang **Tích hợp** và cấu hình header `Authorization: Apikey {secret}` trong bảng điều khiển SePay.

#### ThueAPIBank

Kích hoạt khi ThueAPIBank ghi nhận giao dịch và gửi webhook. Tương tự SePay, phù hợp để tự động hóa xử lý thanh toán.

Yêu cầu: bật tích hợp ThueAPIBank tại trang **Tích hợp**.

#### Webhook tùy chỉnh

Kích hoạt khi bất kỳ dịch vụ nào gửi POST request tới webhook URL của bạn với header `X-Sec-Key: {secret}`. Phù hợp để tích hợp với các dịch vụ không có sẵn (form submission, payment gateway khác, automation tool...).

Toàn bộ JSON body sẽ có sẵn trong `event.data`.

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

Kích hoạt một lần khi nhiều tin nhắn bị xóa cùng lúc, ví dụ khi dùng lệnh purge hoặc xóa hàng loạt.

> 💡 Truy cập danh sách ID đã xóa qua `event.message_ids`, cùng `channel.id` và `guild.id`. Xem [Dữ liệu của sự kiện](#dữ-liệu-của-sự-kiện).

### Reaction

> 💡 Dùng `event.emoji` (emoji được thả), `user` (người reaction), `message.id` (tin nhắn) và `channel.id`. Với **Reaction Remove**, `user` chỉ có `id`/`mention`. Xem [Dữ liệu của sự kiện](#dữ-liệu-của-sự-kiện).

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

> 💡 Truy cập `user` (người bị ban / gỡ ban) và `guild.id`. Xem [Dữ liệu của sự kiện](#dữ-liệu-của-sự-kiện).

#### Guild Ban Add

Kích hoạt khi một thành viên bị ban khỏi server. Hữu ích để ghi log hoặc thông báo cho đội kiểm duyệt.

#### Guild Ban Remove

Kích hoạt khi lệnh ban của một thành viên được gỡ. Thường dùng kết hợp với **Guild Ban Add** để theo dõi lịch sử ban/unban.

### Kênh & Voice

> 💡 **Channel Create/Delete**: `channel` có cả `name`. **Voice State Update**: `user`, `channel` (kênh voice) và `event.voice` (`mute`/`deaf`/`self_*`). Xem [Dữ liệu của sự kiện](#dữ-liệu-của-sự-kiện).

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
- Dữ liệu khả dụng khác nhau theo loại sự kiện — xem [Dữ liệu của sự kiện](#dữ-liệu-của-sự-kiện).
- Sự kiện webhook không có placeholder `user`, `message`, `channel`, `guild` — chỉ có `event.data`.
- Tích hợp webhook phải được **bật** mới có thể nhận sự kiện — xem [Tích hợp Webhook](/reference/integration).

## Liên quan

- [Khối Lắng nghe sự kiện](/reference/blocks/entries/entry_event) — điểm bắt đầu của flow sự kiện
- [Bộ lọc sự kiện](/reference/blocks/options/option_event_filter) — giới hạn khi nào flow chạy
- [Tích hợp Webhook](/reference/integration) — cài đặt SePay, ThueAPIBank, Custom Webhook
- [Lệnh tùy chỉnh](/reference/command) — điểm vào còn lại để người dùng chủ động gọi
- [Biến lưu trữ](/reference/variable) — lưu dữ liệu khi ghi log hoặc đếm sự kiện
