---
sidebar_position: 40
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Xử lý lỗi

<EmbedFlowNode type="control_error_handler" />

> Cho phép flow tiếp tục ngay cả khi một khối phía sau gặp lỗi.

## Khi nào dùng

- Tránh để flow dừng giữa chừng khi một khối lỗi.
- Xử lý lỗi gọi API/AI một cách mềm mại.

## Lưu ý & liên quan

- Bình thường lỗi sẽ **dừng** flow. Đặt khối này phía trước phần có thể lỗi để flow vẫn chạy tiếp.
- Khối này **không tốn credit**.
- [Các khối](/reference/blocks/)

<NodeInfoExplorer type="control_error_handler" />
