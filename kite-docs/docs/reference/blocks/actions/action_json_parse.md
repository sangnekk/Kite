---
sidebar_position: 51
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Phân tích JSON

<EmbedFlowNode type="action_json_parse" />

> Chuyển một chuỗi JSON thành đối tượng để truy cập từng trường.

## Khi nào dùng

- Xử lý phản hồi JSON từ [Gửi yêu cầu API](/reference/blocks/actions/action_http_request).
- Đọc dữ liệu có cấu trúc.

## Cấu hình

> `Đầu vào` — chuỗi JSON hoặc giá trị cần xử lý.

## Kết quả trả về

Đặt một `id` cho khối rồi truy cập các trường bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Gửi yêu cầu API](/reference/blocks/actions/action_http_request)
- [Tạo JSON](/reference/blocks/actions/action_json_build)

<NodeInfoExplorer type="action_json_parse" />
