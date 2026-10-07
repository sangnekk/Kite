---
sidebar_position: 4
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Menu chọn

<EmbedFlowNode type="entry_component_select" />

> Điểm bắt đầu khi người dùng chọn các mục trong menu trên tin nhắn.

## Khi nào dùng

- Menu sản phẩm, ticket, role picker hoặc chọn người dùng/kênh.
- Builder tự tạo flow này khi cấu hình hành động của menu trong message template.
- Một menu có một flow, không phải một flow cho từng lựa chọn.

## Nối hành động

- Nhánh chung không có `sourceHandle`: chạy trước, một lần cho mỗi tương tác.
- String Select: `option_<optionID>` chạy khi mục được chọn; `option_<optionID>_unselected` chạy khi mục không được chọn. Các nhánh chạy theo thứ tự option trong cấu hình.
- Dùng ID nội bộ của option, không dùng label hoặc value làm handle. Đổi label/value không đổi binding.
- Menu inline trong message node: nhánh chung là `component_<componentID>`; nhánh option là `component_<componentID>_option_<optionID>`, thêm `_unselected` cho nhánh không chọn. Không thêm entry thứ hai vào flow inline.
- Entity Select và option động chỉ dùng nhánh chung; có thể xử lý danh sách bằng for-each.

## Biến

- `{{select.values}}`, `{{select.value}}`, `{{select.count}}`: toàn bộ giá trị, giá trị đầu tiên, số mục được chọn.
- String Select: `{{select.options}}`, `{{select.labels}}`.
- Entity Select: `{{select.users}}`, `{{select.members}}`, `{{select.roles}}`, `{{select.channels}}`, `{{select.mentionables}}` theo loại menu.
- Trong nhánh option: `{{option.value}}`, `{{option.label}}`, `{{option.description}}`, `{{option.index}}`.
- `{{user.id}}` vẫn là người thao tác, không phải người được chọn.

## Lưu ý

- Một action row chứa đúng một menu; không trộn menu với button.
- String Select có 1–25 option; value duy nhất, không template. `min_values` có thể bằng 0; `max_values` không vượt số option.
- Discord gửi toàn bộ tập đang chọn. Nhánh `_unselected` chạy cho từng mục không thuộc tập đó, không chỉ mục vừa bỏ chọn.
- Cấu hình quyền sử dụng nằm trên component: mọi người, vai trò, quyền hoặc người kích hoạt ban đầu.
- Message template chạy theo snapshot lúc gửi/cập nhật. Sửa template không tự đổi hành vi của tin nhắn đã gửi.
- Dùng `action_response_create` để trả lời; `action_response_edit` với `@original` để sửa tin gốc. Flow không trả lời được ack im lặng.
- Khối entry không tốn credit; các hành động phía sau vẫn tính như bình thường.

<NodeInfoExplorer type="entry_component_select" />
