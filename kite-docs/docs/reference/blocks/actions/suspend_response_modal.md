---
sidebar_position: 7
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Hiển thị modal

<EmbedFlowNode type="suspend_response_modal" />

Thay vì tạo phản hồi tin nhắn, bạn cũng có thể hiển thị modal để yêu cầu thêm thông tin từ người dùng. Modal có thể chứa nhiều ô nhập liệu và bạn có thể truy cập chúng bằng biến `input(...)` sau khi modal được gửi.

Phản hồi bằng modal sẽ khởi chạy một sub-flow và tạm dừng cho đến khi người dùng gửi modal. Xem [Sub-Flows](/reference/sub-flows) để biết thêm cách modal hoạt động.

<NodeInfoExplorer type="suspend_response_modal" />
