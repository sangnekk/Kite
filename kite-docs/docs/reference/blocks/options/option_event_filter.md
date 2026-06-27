---
sidebar_position: 49
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Bộ lọc sự kiện

<EmbedFlowNode type="option_event_filter" />

> Giới hạn khi nào một bộ lắng nghe sự kiện được kích hoạt.

## Khi nào dùng

- Chỉ phản hồi sự kiện ở một kênh nhất định.
- Chỉ xử lý khi nội dung chứa từ khoá.

## Cấu hình

> `Thuộc tính` — thuộc tính của sự kiện đem ra lọc.
>
> `Cách lọc` — kiểu so khớp (bằng, chứa...).
>
> `Giá trị` — giá trị đem ra so khớp.

## Lưu ý & liên quan

- Khối này **không tốn credit**.
- [Sự kiện](/reference/event)
- [Lắng nghe sự kiện](/reference/blocks/entries/entry_event)

<NodeInfoExplorer type="option_event_filter" />
