---
sidebar_position: 48
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Định dạng danh sách

<EmbedFlowNode type="action_list_format" />

Khối `Format list` duyệt qua từng phần tử của một danh sách, render mỗi phần tử theo một mẫu, rồi nối lại thành một chuỗi. Rất hợp để tạo bảng xếp hạng nhiều dòng.

### Cài đặt

> `Danh sách` Danh sách đầu vào.
>
> `Mẫu mỗi phần tử` Mẫu áp dụng cho từng phần tử. Dùng `{{item}}` cho phần tử và `{{index}}` cho vị trí (bắt đầu từ 0). Với phần tử là đối tượng, dùng `{{item.field}}`.
>
> `Ký tự nối` Chuỗi nối giữa các phần tử (mặc định xuống dòng; dùng `\n`, `\t`).

### Ví dụ
Bảng xếp hạng: `#{{item.rank}} <@{{item.scope}}>: {{item.balance}}` nối bằng xuống dòng.

<NodeInfoExplorer type="action_list_format" />
