---
slug: /reference/blocks/actions/action_event_emit
sidebar_position: 36
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Phát sự kiện nội bộ

<EmbedFlowNode type="action_event_emit" />

> Phát một event đã đăng ký để kích hoạt các flow đang lắng nghe trong cùng ứng dụng.

## Khi nào dùng

- Thông báo cho flow nhiệm vụ hoặc thành tựu sau một hành động.
- Gửi dữ liệu tới flow audit log tập trung.
- Tách logic phụ khỏi flow lệnh, lịch biểu hoặc webhook.

## Cấu hình

> `Sự kiện nội bộ` — chọn event key từ registry của ứng dụng.
>
> `Payload` — object key/value gửi tới flow nhận. Chuỗi hỗ trợ placeholder; dùng **Chỉnh JSON nâng cao** cho dữ liệu lồng nhau.
>
> `Chế độ thực thi` — `async` để chạy tiếp ngay hoặc `sync` để chờ tất cả flow nhận hoàn tất.

Ví dụ payload:

```json
{
  "user_id": "{{ user.id }}",
  "item_id": "sword_01",
  "price": 500
}
```

Flow nhận đọc giá bằng `{{ event.payload.price }}`.

## Kết quả trả về

Đặt ID cho khối, ví dụ `emit_purchase`, rồi đọc metadata bằng `result('emit_purchase')`:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `event_id` | string | ID riêng của lần phát |
| `event_name` | string | Tên event tại thời điểm phát |
| `subscriber_count` | number | Số flow nhận đang bật |
| `mode` | string | `async` hoặc `sync` |

```text
{{ result('emit_purchase').subscriber_count }}
```

Payload không nằm trong result. Ở flow nhận, luôn dùng `event.payload.{key}`.

## Lưu ý và liên quan

- Tốn **1 credit** mỗi lần khối chạy.
- Payload tối đa **64 KiB**.
- Chuỗi emit lồng nhau có độ sâu tối đa **8**.
- Emitter và listener phải thuộc cùng ứng dụng.
- [Hướng dẫn sự kiện nội bộ](/reference/custom-events)
- [Khi có sự kiện nội bộ](/reference/blocks/entries/entry_custom_event)

<NodeInfoExplorer type="action_event_emit" />

