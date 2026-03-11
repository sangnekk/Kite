---
sidebar_position: 26
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo kênh

<EmbedFlowNode type="action_channel_create" />

Khối `Create channel` được dùng để tạo một kênh trong danh mục đã chọn.

Bạn có thể chọn nhiều loại kênh khác nhau, bao gồm:

> `Text`
>
> `Voice`
>
> `Category`
>
> `Announcement`
>
> `Stage`
>
> `Forum`
>
> `Media`

### Tùy chọn

> `Name` Tên của kênh.
>
> `Topic` Chủ đề của kênh.
>
> `Category` Danh mục mà kênh sẽ được tạo trong đó.
>
> `Position` Vị trí của kênh.

### Ghi đè quyền

Tại đây bạn có thể chọn role và người dùng nào có quyền truy cập kênh. Để trống nếu muốn cho phép tất cả role và người dùng truy cập.

<NodeInfoExplorer type="action_channel_create" />
