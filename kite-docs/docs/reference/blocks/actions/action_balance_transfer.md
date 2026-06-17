---
sidebar_position: 41
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chuyển tiền

<EmbedFlowNode type="action_balance_transfer" />

Khối `Transfer balance` chuyển tiền từ một người dùng sang người khác **một cách nguyên tử** (cả hai thay đổi cùng thành công hoặc cùng thất bại). Mặc định sẽ báo lỗi nếu người gửi không đủ tiền.

### Cài đặt

> `Variable` Biến lưu số dư.
>
> `Người dùng` Người gửi, mặc định `{{user.id}}`.
>
> `Người nhận` Người nhận tiền.
>
> `Số tiền` Số tiền chuyển.
>
> `Cho phép số dư âm` Nếu bật, số dư người gửi có thể xuống dưới 0.

### Đầu ra
Kết quả là một đối tượng `{ from_balance, to_balance }` — số dư mới của người gửi và người nhận.

<NodeInfoExplorer type="action_balance_transfer" />
