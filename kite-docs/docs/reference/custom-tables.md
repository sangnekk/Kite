---
sidebar_position: 7
---

# Bảng dữ liệu tùy chỉnh

Bảng dữ liệu tùy chỉnh là mini database có schema cho ứng dụng. Bạn có thể quản lý shop, inventory, nhiệm vụ, cảnh cáo hoặc dữ liệu game mà không cần dựng database riêng.

Số bảng có thể tạo phụ thuộc vào gói hiện tại. Tab **Dữ liệu** hiển thị số bảng đã dùng và giới hạn; khi đạt quota, Kite giữ nguyên các bảng hiện có nhưng không cho tạo thêm cho đến khi bạn xóa bớt hoặc nâng cấp gói.

Trong cấu hình plan, `feature_max_custom_tables = 0` nghĩa là không được dùng tính năng, số dương là số bảng tối đa, còn `-1` nghĩa là không giới hạn.

:::warning Chọn đúng kiểu trước khi lưu dữ liệu

- Discord ID như user ID, guild ID và channel ID phải dùng kiểu **Chuỗi**. Kiểu **Số** không giữ an toàn các số nguyên Discord dài.
- Đổi kiểu hoặc xóa cột có thể làm thay đổi dữ liệu hiện có. Kite luôn hiển thị cảnh báo và chỉ lưu schema mới khi toàn bộ dữ liệu chuyển đổi thành công.

:::

## Bắt đầu nhanh

1. Mở tab **Dữ liệu** của ứng dụng.
2. Bấm **Tạo bảng đầu tiên**.
3. Đặt tên bảng là `shop_items`, chọn phạm vi **Toàn ứng dụng**.
4. Tạo các cột:

| Tên | Kiểu | Tùy chọn |
| --- | --- | --- |
| `sku` | Chuỗi | Bắt buộc, Unique |
| `name` | Chuỗi | Bắt buộc |
| `price` | Số | Bắt buộc |
| `stock` | Số | Mặc định `0` |
| `metadata` | JSON | Không bắt buộc |

5. Lưu schema, sau đó bấm **Thêm dòng** hoặc **Nhập** để thêm dữ liệu.
6. Trong Flow Editor, dùng [Tìm một dòng](/reference/blocks/actions/action_table_find_one) để đọc item theo `sku`.

## Phạm vi dữ liệu

| Phạm vi | Cách hoạt động | Khi nên dùng |
| --- | --- | --- |
| Toàn ứng dụng | Mọi server dùng chung một tập dữ liệu | Danh mục shop, cấu hình chung |
| Theo máy chủ | Mỗi server có tập dòng riêng | Inventory, cảnh cáo, điểm server |

Với bảng theo máy chủ, Dashboard yêu cầu chọn server trước khi xem, nhập hoặc xuất. Trong flow, đặt **Server ID** thành `{{ guild.id }}` hoặc ID server phù hợp với ngữ cảnh.

Ràng buộc Unique cũng tuân theo phạm vi: bảng toàn ứng dụng kiểm tra trên toàn bảng; bảng theo máy chủ cho phép cùng một giá trị xuất hiện ở hai server khác nhau.

## Kiểu cột

| Kiểu | Giá trị hợp lệ | Ví dụ |
| --- | --- | --- |
| Chuỗi | Văn bản | `"1111475415039619144"` |
| Số | Số nguyên hoặc số thực | `500`, `12.5` |
| Đúng/Sai | Boolean | `true`, `false` |
| Thời gian | Chuỗi RFC3339 | `2026-08-17T14:30:00Z` |
| JSON | Object, array hoặc JSON scalar | `{ "rarity": "epic" }` |

**Bắt buộc** không cho phép bỏ trống. **Mặc định** được áp dụng khi dòng mới không truyền cột đó. **Unique** ngăn hai dòng trong cùng phạm vi có cùng giá trị.

## Nhập CSV hoặc JSON

Bấm **Nhập** trên thanh công cụ của bảng, chọn file và một trong hai chế độ:

- **Thêm vào dữ liệu hiện có**: giữ các dòng cũ và thêm dòng mới.
- **Thay thế dữ liệu hiện có**: thay toàn bộ dòng trong phạm vi đang chọn bằng nội dung file.

Kite kiểm tra toàn bộ file và ghi dữ liệu trong một transaction. Nếu một dòng sai kiểu, thiếu cột bắt buộc hoặc trùng Unique, không dòng nào được nhập và dữ liệu cũ không bị thay đổi.

### CSV

Hàng đầu tiên phải chứa **tên cột trong schema**:

```csv
sku,name,price,stock,metadata
sword_01,Kiếm sắt,500,10,"{""rarity"":""common""}"
potion_01,Bình máu,75,25,"{""heal"":25}"
```

Kite đọc kiểu của từng ô theo schema. Ô trống được xem là không truyền giá trị, vì vậy cột sẽ dùng default nếu có.

### JSON

File phải là một mảng object và dùng tên cột trong schema:

```json
[
  {
    "sku": "sword_01",
    "name": "Kiếm sắt",
    "price": 500,
    "stock": 10,
    "metadata": { "rarity": "common" }
  }
]
```

JSON phải giữ đúng kiểu. Ví dụ `price` dùng `500`, không dùng chuỗi `"500"`.

Mỗi lần nhập tối đa **5 MiB** và **10.000 dòng**.

## Xuất CSV hoặc JSON

Bấm **Xuất**, chọn định dạng rồi tải file. File chỉ chứa phạm vi đang chọn và dùng tên cột, nên có thể sửa rồi nhập lại.

- CSV có BOM UTF-8 để mở đúng tiếng Việt trong ứng dụng bảng tính. Giá trị Chuỗi bắt đầu bằng ký tự công thức được vô hiệu hóa an toàn và được khôi phục khi nhập lại vào Kite.
- JSON là mảng object dễ đọc và giữ được object/array lồng nhau.
- Mỗi lần xuất tối đa **10.000 dòng**.

## Dùng trong flow

Nhóm **Cơ sở dữ liệu** có năm khối:

| Khối | Công dụng | Result chính |
| --- | --- | --- |
| [Thêm dòng dữ liệu](/reference/blocks/actions/action_table_insert) | Tạo một dòng | `id`, `row` |
| [Tìm một dòng](/reference/blocks/actions/action_table_find_one) | Lấy dòng đầu tiên khớp bộ lọc | `found`, `row` |
| [Truy vấn bảng](/reference/blocks/actions/action_table_query) | Lấy nhiều dòng có phân trang | `rows`, `count`, `total_count` |
| [Cập nhật dòng dữ liệu](/reference/blocks/actions/action_table_update) | Set, tăng hoặc giảm giá trị | `affected_rows` |
| [Xóa dòng dữ liệu](/reference/blocks/actions/action_table_delete) | Xóa các dòng khớp bộ lọc | `affected_rows` |

Ví dụ khối tìm có ID `find_item`:

```text
{{ result('find_item').found }}
{{ result('find_item').row.name }}
{{ result('find_item').row.price }}
```

Object `row` dùng **tên cột**, không dùng ID cột nội bộ. Nó cũng có metadata `id`, `scope_id`, `version`, `created_at` và `updated_at`.

:::tip Kiểm tra `found` trước khi đọc dòng

Khi không tìm thấy dữ liệu, `found` là `false` và `row` là `null`. Hãy nối một khối điều kiện trước khi dùng `result('find_item').row.price`.

:::

## Đổi schema khi đã có dữ liệu

Khi lưu schema mới, Kite thử chuyển đổi tất cả dòng hiện tại:

- Chuỗi `"42"` có thể đổi sang Số.
- Chuỗi `"true"` hoặc `"false"` có thể đổi sang Đúng/Sai.
- Chuỗi thời gian hợp lệ có thể đổi sang Thời gian.
- Chuỗi chứa JSON hợp lệ có thể đổi sang JSON; văn bản thường vẫn được giữ như JSON string.
- Các kiểu khác có thể đổi sang Chuỗi bằng biểu diễn JSON.

Nếu có giá trị không thể chuyển, Kite báo tên cột, số dòng lỗi và một vài ví dụ. Schema lẫn dữ liệu đều được rollback. Khi xóa cột và xác nhận lưu thành công, dữ liệu của cột đó bị xóa vĩnh viễn.

## Xử lý lỗi thường gặp

| Thông báo | Cách xử lý |
| --- | --- |
| Không tìm thấy cột trong cấu trúc bảng | Sửa tiêu đề CSV hoặc key JSON cho khớp tên cột hiện tại |
| Cột phải là số | Bỏ ký tự tiền tệ/dấu phân cách hoặc đổi cột sang Chuỗi |
| ID Discord nên dùng kiểu Chuỗi | Đổi schema cột ID sang Chuỗi và giữ giá trị trong dấu ngoặc kép ở JSON |
| Cột phải là duy nhất và đang bị trùng | Xóa/sửa dòng trùng hoặc bỏ tùy chọn Unique |
| Hãy chọn server trước khi thao tác dữ liệu | Chọn server trên Dashboard hoặc truyền Server ID trong flow |

## Liên quan

- [Biến lưu trữ](/reference/variable)
- [Biểu thức](/reference/expressions)
- [Danh sách và JSON](/reference/blocks/actions/action_list_format)
