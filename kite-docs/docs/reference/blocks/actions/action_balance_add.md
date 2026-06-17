---
sidebar_position: 38
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Cộng số dư

<EmbedFlowNode type="action_balance_add" />

Khối `Add balance` cộng thêm tiền vào số dư của một người dùng. Kết quả trả về là số dư mới.

### Cài đặt

> `Variable` Biến lưu số dư của loại tiền tệ.
>
> `Người dùng` Người được cộng tiền, mặc định `{{user.id}}`.
>
> `Số tiền` Số tiền cần cộng.

<NodeInfoExplorer type="action_balance_add" />
