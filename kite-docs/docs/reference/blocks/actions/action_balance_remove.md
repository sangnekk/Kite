---
sidebar_position: 39
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Trừ số dư

<EmbedFlowNode type="action_balance_remove" />

Khối `Remove balance` trừ tiền khỏi số dư của một người dùng. Mặc định, thao tác sẽ báo lỗi nếu người dùng không đủ tiền — hãy bọc khối này trong khối `Xử lý lỗi`, hoặc bật `Cho phép số dư âm`.

### Cài đặt

> `Variable` Biến lưu số dư.
>
> `Người dùng` Người bị trừ tiền, mặc định `{{user.id}}`.
>
> `Số tiền` Số tiền cần trừ.
>
> `Cho phép số dư âm` Nếu bật, số dư có thể xuống dưới 0.

<NodeInfoExplorer type="action_balance_remove" />
