---
sidebar_position: 42
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Bảng xếp hạng số dư

<EmbedFlowNode type="action_balance_leaderboard" />

Khối `Balance leaderboard` lấy danh sách những người có số dư cao nhất cho một loại tiền tệ, sắp xếp giảm dần.

### Cài đặt

> `Variable` Biến lưu số dư.
>
> `Số lượng` Số người muốn lấy (mặc định 10, tối đa 100).

### Đầu ra
Kết quả là một mảng các đối tượng `{ rank, scope, balance }`. Dùng khối `Định dạng danh sách` để hiển thị thành nhiều dòng.

<NodeInfoExplorer type="action_balance_leaderboard" />
