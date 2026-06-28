---
slug: /reference/blocks/actions/action_json_build
sidebar_position: 52
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tạo JSON

<EmbedFlowNode type="action_json_build" />

> Chuyển một giá trị thành chuỗi JSON.

## Khi nào dùng

- Tạo body JSON để gửi qua [Gửi yêu cầu API](/reference/blocks/actions/action_http_request).

## Cấu hình

> `Đầu vào` — chuỗi JSON hoặc giá trị cần xử lý.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy chuỗi JSON bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Phân tích JSON](/reference/blocks/actions/action_json_parse)
- [Gửi yêu cầu API](/reference/blocks/actions/action_http_request)

<NodeInfoExplorer type="action_json_build" />
