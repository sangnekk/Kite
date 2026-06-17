---
sidebar_position: 37
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xem số dư

<EmbedFlowNode type="action_balance_get" />

Khối `Get balance` lấy số dư của một người dùng cho một loại tiền tệ. Một loại tiền tệ chính là một [biến lưu trữ](https://docs.kite.onl/reference/variable) có bật phạm vi (scoped). Nếu người dùng chưa có số dư, kết quả trả về là `0`.

### Cài đặt

> `Variable` Biến dùng để lưu số dư của loại tiền tệ.
>
> `Người dùng` Người cần xem số dư, mặc định là người chạy lệnh (`{{user.id}}`).

<NodeInfoExplorer type="action_balance_get" />
