---
slug: /reference/blocks/actions/action_random_generate
sidebar_position: 33
---

import EmbedFlowNode from "@site/src/components/EmbedFlowNode";
import NodeInfoExplorer from "@site/src/components/NodeInfoExplorer";

# Tạo số ngẫu nhiên

<EmbedFlowNode type="action_random_generate" />

> Tạo một số nguyên ngẫu nhiên trong khoảng cho trước.

## Khi nào dùng

- Tung xúc xắc, quay số may mắn, chọn ngẫu nhiên.
- Thêm yếu tố ngẫu nhiên cho phần thưởng.

## Cấu hình

> `Tối thiểu` — giá trị nhỏ nhất.
>
> `Tối đa` — giá trị lớn nhất.

## Kết quả trả về

Đặt một `id` cho khối rồi lấy số ngẫu nhiên bằng `result('id')`.

## Lưu ý & liên quan

- Tốn **1 credit** mỗi lần chạy. Xem [Hệ thống credit](/reference/credit-system).
- [Chọn ngẫu nhiên từ danh sách](/reference/blocks/actions/action_list_pick)

<NodeInfoExplorer type="action_random_generate" />
