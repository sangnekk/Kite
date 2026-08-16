---
sidebar_position: 5
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Khi có sự kiện nội bộ

<EmbedFlowNode type="entry_custom_event" />

> Điểm bắt đầu của flow chạy khi một flow khác phát event nội bộ đã đăng ký.

## Khi nào dùng

- Tách logic nhiệm vụ, thành tựu, level-up hoặc audit log khỏi flow chính.
- Cho nhiều flow phản ứng độc lập với cùng một hành động.
- Nhận payload từ khối [Phát sự kiện nội bộ](/reference/blocks/actions/action_event_emit).

## Cấu hình

> `Sự kiện nội bộ` — event key đã đăng ký ở trang **Sự kiện**.
>
> `Mô tả` — mục đích của bộ lắng nghe.
>
> `Điều kiện lọc` — biểu thức boolean tùy chọn, ví dụ `event.payload.price >= 1000`. Không dùng `{{ }}` trong trường này.

## Dữ liệu khả dụng

Khối entry **không tạo `result()`**. Payload được đọc trực tiếp từ context của event:

```text
{{ event.name }}
{{ event.payload.test }}
{{ event.timestamp }}
```

Với payload `{ "test": "abc" }`, `{{ event.payload.test }}` trả về `abc`.

Custom event không tự có `user`, `message`, `channel` hoặc `guild`. Hãy gửi dữ liệu cần thiết trong payload.

## Lưu ý và liên quan

- Khối này không tốn credit.
- Một event có thể có nhiều flow nhận đang bật.
- [Hướng dẫn sự kiện nội bộ](/reference/custom-events)
- [Phát sự kiện nội bộ](/reference/blocks/actions/action_event_emit)
- [Biểu thức](/reference/expressions)

<NodeInfoExplorer type="entry_custom_event" />

