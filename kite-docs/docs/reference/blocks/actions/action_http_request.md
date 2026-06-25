---
sidebar_position: 35
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Gửi yêu cầu API

<EmbedFlowNode type="action_http_request" />

> Gửi HTTP request tới API/dịch vụ web bên ngoài và nhận về dữ liệu.

## Khi nào dùng

- Tích hợp dịch vụ ngoài: thời tiết, game, cơ sở dữ liệu...
- Kích hoạt webhook.
- Lấy dữ liệu động để đưa vào tin nhắn.

## Cấu hình

> `Yêu cầu` — phương thức, URL, header và body của HTTP request.

## Kết quả trả về

Đặt một `id` cho khối, rồi truy cập phản hồi bằng `result('id')` — ví dụ `result('id').data().tenTruong` để lấy một trường trong JSON trả về.

## Ví dụ

Gọi một API JSON:
1. **Gửi yêu cầu API**: phương thức `GET`, URL của API. Đặt `id` = `api`.
2. Lấy trường trong phản hồi bằng `{{ result('api').data().tenTruong }}`.

## Lưu ý & liên quan

- Tốn **3 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Phân tích JSON](/reference/blocks/actions/action_json_parse)
- [Biểu thức](/reference/expressions)

<NodeInfoExplorer type="action_http_request" />
