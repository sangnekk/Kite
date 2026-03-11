---
sidebar_position: 4
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo tin nhắn phản hồi

<EmbedFlowNode type="action_response_create" />

Khối `Create response message` được dùng để phản hồi lệnh hoặc tương tác thành phần. Thông thường mỗi lệnh hoặc tương tác cần tạo một phản hồi tin nhắn. Ngoại lệ duy nhất là khi bạn hiển thị modal thay thế.

Bạn có thể cấu hình tin nhắn trực tiếp trong khối hoặc dùng mẫu tin nhắn. Cả hai cách đều hỗ trợ embed và thành phần tương tác. Mẫu tin nhắn phù hợp hơn khi bạn muốn tái sử dụng cùng một nội dung ở nhiều nơi.

Nếu tin nhắn chứa thành phần tương tác, flow sẽ tạm dừng cho đến khi người dùng tương tác với tin nhắn. Xem [Sub-Flows](/reference/sub-flows) để biết thêm cách hoạt động của các thành phần tương tác.

<NodeInfoExplorer type="action_response_create" />
