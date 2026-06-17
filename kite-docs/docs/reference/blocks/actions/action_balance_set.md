---
sidebar_position: 40
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đặt số dư

<EmbedFlowNode type="action_balance_set" />

Khối `Set balance` đặt số dư của một người dùng thành một giá trị cố định, ghi đè giá trị cũ.

### Cài đặt

> `Variable` Biến lưu số dư.
>
> `Người dùng` Người cần đặt số dư, mặc định `{{user.id}}`.
>
> `Số tiền` Giá trị số dư mới.

<NodeInfoExplorer type="action_balance_set" />
