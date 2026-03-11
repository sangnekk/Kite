---
sidebar_position: 30
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đặt biến lưu trữ

<EmbedFlowNode type="action_variable_set" />

Khối `Set stored variable` được dùng để lưu một giá trị vào biến, sau đó có thể lấy lại bằng khối `Get stored variable`.

### Cài đặt

> `Variable` Chọn một biến từ danh sách [Stored Variables](https://docs.kite.onl/reference/variable).
> 
> `Operation` Biến sẽ thực hiện thao tác gì?
>
> `Value` Giá trị cần thay đổi.

### Đầu ra
Để sử dụng biến này ở các bước tiếp theo, bạn dùng khối `Get Variable`.

<NodeInfoExplorer type="action_variable_set" />
