---
sidebar_position: 47
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Chọn ngẫu nhiên từ danh sách

<EmbedFlowNode type="action_list_pick" />

Khối `Pick from list` chọn ngẫu nhiên một phần tử trong một danh sách. Hữu ích cho giveaway hoặc phần thưởng ngẫu nhiên.

### Cài đặt

> `Danh sách` Một danh sách (ví dụ kết quả của một khối khác, hoặc `{{["a", "b", "c"]}}`).

### Đầu ra
Phần tử được chọn. Nếu danh sách rỗng, kết quả là rỗng.

<NodeInfoExplorer type="action_list_pick" />
