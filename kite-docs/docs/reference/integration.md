---
sidebar_position: 8
---

# Tích hợp Webhook

Tích hợp Webhook cho phép bot của bạn nhận sự kiện từ các dịch vụ bên ngoài — chẳng hạn khi có giao dịch thanh toán mới từ SePay, ThueAPIBank, hoặc bất kỳ dịch vụ nào hỗ trợ webhook.

Khi dịch vụ bên ngoài gửi webhook, Kite sẽ chuyển tiếp sự kiện đó tới các **bộ lắng nghe sự kiện** đang theo dõi nguồn tương ứng. Flow sẽ được kích hoạt tự động với toàn bộ dữ liệu từ webhook.

## Các tích hợp được hỗ trợ

| Tích hợp | Xác thực |
| --- | --- |
| **SePay** | Header `Authorization: Apikey {secret}` hoặc `X-Secret-Key: {secret}` |
| **ThueAPIBank** | Header `signature: {signature}` — giá trị do bạn cài trong dashboard ThueAPIBank |
| **Webhook tùy chỉnh** | Header `X-Sec-Key: {secret}` |

## Cài đặt tích hợp

### SePay

1. Bật tích hợp SePay tại trang **Tích hợp** → sao chép **Webhook URL** và **Secret**
2. Mở dashboard SePay → mục webhook → dán Webhook URL vào
3. Điền **Secret** vào trường API key của SePay — SePay sẽ gửi kèm header `Authorization: Apikey {secret}` trong mọi request

### ThueAPIBank

ThueAPIBank **không cho phép ta tự đặt chữ ký** — signature được cài cố định trong dashboard của họ. Quy trình cài đặt ngược lại so với SePay:

1. Mở dashboard ThueAPIBank → mục webhook → xem giá trị **Signature** được cấp sẵn
2. **Sao chép giá trị Signature đó** vào ô **Secret** trong trang **Tích hợp** của Kite
3. Sao chép **Webhook URL** từ Kite → dán vào dashboard ThueAPIBank

Khi ThueAPIBank gửi webhook, họ đính kèm `signature: {giá_trị}` vào header. Kite so sánh giá trị đó với secret bạn đã lưu để xác thực.

### Webhook tùy chỉnh

1. Bật tích hợp tại trang **Tích hợp** → sao chép **Webhook URL** và **Secret**
2. Cấu hình dịch vụ bên ngoài gửi POST request đến Webhook URL kèm header `X-Sec-Key: {secret}`

:::tip

Với SePay và Custom Webhook, Secret do Kite sinh ra và bạn điền vào dịch vụ bên ngoài. Với ThueAPIBank thì ngược lại — bạn lấy signature từ ThueAPIBank và điền vào Kite.

:::

## Webhook URL

Webhook URL có dạng:

```
https://webhook.vibehost.vn/webhook/{discordBotId}/{type}/{integrationId}
```

Trong đó:
- `{discordBotId}` — Discord Bot ID của ứng dụng (hiển thị công khai)
- `{type}` — loại tích hợp: `sepay`, `thueapibank`, hoặc `custom`
- `{integrationId}` — UUID ngẫu nhiên, sinh tự động khi tạo tích hợp

## Tạo bộ lắng nghe sự kiện

Sau khi bật tích hợp, bạn cần tạo **Bộ lắng nghe sự kiện** để xử lý webhook:

1. Bấm biểu tượng **Sự kiện** trên thanh bên trái
2. Bấm **Tạo bộ lắng nghe**
3. Ở mục **Nguồn**, chọn tích hợp tương ứng (ví dụ: `SePay`)
4. Kéo các khối hành động và nối vào khối **Lắng nghe sự kiện**
5. Lưu và bật bộ lắng nghe

Xem thêm tại [Bộ lắng nghe sự kiện](/reference/event).

## Dữ liệu của sự kiện webhook

Khi webhook được nhận, toàn bộ JSON payload từ dịch vụ bên ngoài được truyền vào biến `event.data`. Bạn có thể truy cập bất kỳ trường nào trong đó bằng [biểu thức](/reference/expressions):

```
{{ event.data.amount }}
{{ event.data.transaction_id }}
{{ event.data.transferAmount }}
```

Cấu trúc `event.data` phụ thuộc vào dịch vụ gửi webhook — hãy tham khảo tài liệu của từng dịch vụ để biết các trường có sẵn.

### Ví dụ với SePay

SePay gửi payload có dạng:

```json
{
  "id": 12345,
  "gateway": "MBBank",
  "transactionDate": "2024-01-15 10:30:00",
  "accountNumber": "0123456789",
  "subAccount": null,
  "code": "KITE0001",
  "content": "Thanh toan don hang KITE0001",
  "transferType": "in",
  "description": "...",
  "transferAmount": 150000,
  "accumulated": 150000,
  "referenceCode": "FT24015123456"
}
```

Trong flow, bạn có thể dùng:

| Biểu thức | Kết quả ví dụ |
| --- | --- |
| `{{ event.data.transferAmount }}` | `150000` |
| `{{ event.data.code }}` | `KITE0001` |
| `{{ event.data.content }}` | `Thanh toan don hang KITE0001` |
| `{{ event.data.gateway }}` | `MBBank` |
| `{{ event.data.accountNumber }}` | `0123456789` |

## Lưu ý

- Mỗi ứng dụng chỉ có thể tạo **một tích hợp cho mỗi loại** (một SePay, một ThueAPIBank, một Custom).
- Tích hợp bị **tắt** sẽ bỏ qua mọi webhook đến — flow sẽ không được kích hoạt.
- Kite **xác minh secret** trước khi chuyển tiếp sự kiện. Request không có header hợp lệ sẽ bị từ chối với mã `401`.
- Không có placeholder `user`, `message`, `channel` hay `guild` trong webhook event — chỉ có `event.data` và `app`.

## Liên quan

- [Bộ lắng nghe sự kiện](/reference/event) — cấu hình flow cho webhook
- [Biểu thức](/reference/expressions) — truy cập `event.data` trong flow
- [Khối Lắng nghe sự kiện](/reference/blocks/entries/entry_event) — điểm bắt đầu của flow
