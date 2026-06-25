---
sidebar_position: 42
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Vòng lặp

<EmbedFlowNode type="control_loop" />

> Lặp lại một nhóm hành động nhiều lần.

## Khi nào dùng

- Gửi/nhắc nhiều lần.
- Lặp đến khi đạt điều kiện thoát.

## Cấu hình

> `Số lần` — số lần lặp (để trống để lặp đến khi gặp khối Thoát vòng lặp).

## Ví dụ

1. **Chạy vòng lặp**, `Số lần` = `5`.
2. Trong nhánh **Mỗi lần lặp**, thêm hành động cần lặp.
3. Dùng [Thoát vòng lặp](/reference/blocks/controls/control_loop_exit) để dừng sớm.

## Lưu ý & liên quan

- Để trống `Số lần` để lặp đến khi gặp khối Thoát vòng lặp.
- Khối này **không tốn credit**.
- [Thoát vòng lặp](/reference/blocks/controls/control_loop_exit)
- [Chờ](/reference/blocks/controls/control_sleep)

<NodeInfoExplorer type="control_loop" />
