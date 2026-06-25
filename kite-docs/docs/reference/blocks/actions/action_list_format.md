---
sidebar_position: 48
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Định dạng danh sách

<EmbedFlowNode type="action_list_format" />

> Render mỗi phần tử của danh sách theo một mẫu rồi nối lại (vd bảng xếp hạng).

## Khi nào dùng

- Tạo bảng xếp hạng từ dữ liệu.
- Liệt kê danh sách có định dạng đẹp.

## Cấu hình

> `Danh sách` — danh sách đầu vào.
>
> `Mẫu phần tử` — cách render mỗi phần tử (dùng biểu thức).
>
> `Ký tự nối` — chuỗi chèn giữa các phần tử.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy chuỗi đã ghép bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Nối danh sách](/reference/blocks/actions/action_list_join)
- [Bảng xếp hạng](/reference/blocks/actions/action_balance_leaderboard)

<NodeInfoExplorer type="action_list_format" />
