---
sidebar_position: 9
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo tin nhắn kênh

<EmbedFlowNode type="action_message_create" />

Khối `Create channel message` được dùng để gửi tin nhắn đến một kênh cụ thể.

Bạn có thể cấu hình tin nhắn trực tiếp trong khối hoặc sử dụng mẫu tin nhắn. Trong cả hai trường hợp, bạn đều có thể thêm embed và thành phần tương tác. Mẫu tin nhắn phù hợp hơn khi bạn muốn tái sử dụng cùng một phản hồi ở nhiều nơi.

Nếu tin nhắn chứa thành phần tương tác, flow sẽ tạm dừng cho đến khi người dùng tương tác với tin nhắn. Xem [Sub-Flows](/reference/sub-flows) để biết thêm về cách các thành phần tương tác hoạt động.

<NodeInfoExplorer type="action_message_create" />
