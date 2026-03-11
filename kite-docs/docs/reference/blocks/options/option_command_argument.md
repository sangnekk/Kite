---
sidebar_position: 45
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Đối số lệnh

<EmbedFlowNode type="option_command_argument" />

Khối `Command Argument` cho phép bạn định nghĩa đối số cho slash command. Bạn có thể chỉ định tên, mô tả và kiểu đối số để tạo trải nghiệm lệnh tương tác.

## Trường dữ liệu

### Tên
Nhập tên cho đối số của bạn.

### Mô tả
Nhập mô tả cho đối số của bạn.

### Kiểu
Tại đây bạn có thể chọn loại tùy chọn muốn sử dụng.

### Danh sách kiểu:
> `Text`: Cho phép người dùng nhập văn bản.
>
> `Whole number`: Cho phép người dùng nhập số nguyên.
>
> `True/False`: Cho phép người dùng chọn giữa True và False.
>
> `User`: Cho phép người dùng chọn một người dùng.
>
> `Channel`: Cho phép người dùng chọn một kênh.
>
> `Mentionable`: Cho phép người dùng chọn role hoặc người dùng.
>
> `Attachment`: Cho phép người dùng đính kèm tệp.

### Lựa chọn
Lựa chọn cho phép người dùng chọn một giá trị từ tập tùy chọn được định nghĩa trước.

## Đầu ra

Để dùng kết quả của tùy chọn ở các bước sau trong flow, bạn sử dụng biến
`{{arg('ARGNAME')}}`.

:::tip

`ARGNAME` cần được thay bằng tên đối số bạn đã chọn.

:::

<NodeInfoExplorer type="option_command_argument" />
