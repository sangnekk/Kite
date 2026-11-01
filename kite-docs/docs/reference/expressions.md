---
sidebar_position: 5
---

# Biểu thức

Vibe Bot hỗ trợ tính toán và biến đổi dữ liệu bằng biểu thức. Biểu thức có thể dùng trong khối `Evaluate Expression` (**hỗ trợ cả nhập nhiều dòng**) và trong mọi placeholder được bao bởi `{{` và `}}`.

Trong [lược đồ tổng thể](/), biểu thức là **chất keo** nối các phần lại: bạn dùng nó để đọc đối số lệnh (`arg`), kết quả khối trước (`result`), nội dung người dùng nhập (`input`) và [biến lưu trữ](/reference/variable), rồi tính toán hoặc ghép chuỗi động.

## Cú pháp biểu thức

Biểu thức sử dụng ngôn ngữ [Expr](https://expr-lang.org). Bạn có thể xem chi tiết về tính năng và cú pháp [tại đây](https://expr-lang.org/docs/language-definition).

## Biến khả dụng

Vibe Bot cung cấp các biến sau trong môi trường biểu thức:

```yaml
user:
  id: string
  username: string
  discriminator: string
  display_name: string
  avatar_url: string
  banner_url: string
  mention: string
  role_ids?: []string
  nick?: string

message?: # For message events
  id: string
  content: string

channel:
  id: string

guild?: # For events and interactions inside a server
  id: string # The id of the server

app:
  user: # Access the underlying user of the app
    id: string
    mention: string
```

:::note
Trong **sự kiện**, các placeholder như `user`, `message`, `channel` chỉ khả dụng với một số loại sự kiện nhất định. Xem [Dữ liệu của sự kiện](/reference/event#dữ-liệu-của-sự-kiện).
:::

Trong flow nhận [sự kiện nội bộ](/reference/custom-events), dữ liệu do flow phát gửi sang nằm trong `event.payload`:

```yaml
event:
  name: string
  payload: object
  timestamp: string
```

Ví dụ payload `{ "test": "abc" }` được đọc bằng `{{ event.payload.test }}`. `result()` chỉ đọc kết quả của một khối trong cùng flow, không đọc payload của event nhận.

Ngoài ra còn có một số hàm đặc biệt để truy cập dữ liệu động:

```py
arg('name') # Access value of a command argument
input('identifier') # Access value of a modal input
result('id') # Access the result of a previous block
var('name') # Access a temporary variable named in a previous block
```

Một số hàm của Expr hay dùng trong flow: `upper`, `lower`, `trim`, `split`, `join`, `replace`, `hasPrefix`, `hasSuffix`, `len`, `string`, `int`, `round`, `min`, `max`, `first`, `last`, `filter`, `map`, `now`. Danh sách đầy đủ có trong [tài liệu của Expr](https://expr-lang.org/docs/language-definition).

## Ví dụ

Khi dùng khối `Evaluate Expression`, bạn phải bỏ `{{` và `}}` khỏi nội dung biểu thức.

### Lấy đối số lệnh

Biểu thức này trả về giá trị của đối số `myarg` được truyền vào lệnh.

```python
{{ arg('myarg') }}
```

### Lấy tên hiển thị của người dùng

Biểu thức này trả về tên hiển thị của người dùng đã bấm nút hoặc kích hoạt lệnh/sự kiện.

```python
{{ user.display_name }}
```

### Lấy nội dung tin nhắn

Biểu thức này trả về nội dung tin nhắn đã gửi.

```python
{{ message.content }}
```

### Kiểm tra người dùng có role hay không

Biểu thức này trả về true nếu người dùng có role mang ID `123`.

```python
{{ "123" in user.role_ids }}
```

### Thực hiện phép tính

Biểu thức này trả về kết quả phép tính.

```python
{{ 1 + 1 }}
```

### Trích xuất dữ liệu từ JSON

Biểu thức này trả về giá trị trường `somefield` trong JSON response của khối HTTP request có id `owlspush`.

```python
{{ result('owlspush').data().somefield }}
```

## Trong trình chỉnh sửa flow

Trình chỉnh sửa giúp bạn viết đúng mà không phải nhớ ID hay tên trường.

### Chọn kênh, vai trò và server bằng tên

Các ô nhận ID của **kênh**, **vai trò** và **server** có hai cách nhập, chuyển bằng nút nhỏ cạnh tiêu đề ô:

- **Chọn:** chọn từ danh sách có tìm kiếm (không phân biệt dấu). Kênh được chia theo danh mục, vai trò hiện kèm màu. Nếu bot ở nhiều server, chọn server trước; editor nhớ server bạn chọn gần nhất.
- **Dùng biến:** nhập ID hoặc biểu thức, ví dụ `{{channel.id}}`.

Giá trị lưu vẫn là ID hoặc biểu thức, nên flow cũ mở lại bình thường. Mỗi khối chỉ liệt kê loại kênh nó dùng được: khối gửi tin và lưu transcript không hiện danh mục; khối chuyển thành viên chỉ hiện kênh thoại; khối tạo bài diễn đàn chỉ hiện diễn đàn; chỉ các khối lấy, sửa, xóa kênh mới cho chọn danh mục. Nếu một ID đã lưu không còn trong danh sách (kênh đã xóa, bot đang tắt), nó vẫn được giữ và ghi chú "không có trong danh sách".

:::note
Danh sách lấy từ dữ liệu bot đang giữ, nên bot cần đang chạy và ở trong server đó. Flow chạy ở nhiều server nên dùng biến thay vì chọn một kênh cố định.
:::

### Gợi ý khi gõ biểu thức

Gõ `{{` trong một ô để hiện gợi ý:

- Gõ một chữ để thấy các giá trị, hàm và biến phù hợp, ví dụ `up` gợi ý `upper()`.
- Gõ `.` sau một giá trị để xem các trường của nó: `{{user.` gợi ý `username`, `display_name`...; `{{result('abc').` gợi ý các trường kết quả của khối có id `abc` kèm kiểu và mô tả.
- Chọn bằng chuột hoặc phím mũi tên và Enter. Dấu `}}` được thêm tự động, con trỏ nằm trước nó khi bạn còn gõ tiếp (như sau `result('abc')` để gõ `.`) và nằm trong ngoặc với hàm.

Gợi ý `result('id')` chỉ hiện các khối đứng trước khối đang sửa.

### Báo lỗi khi gõ

Backend không báo lỗi khi bạn gõ sai tên: giá trị đó chỉ ra rỗng khi flow chạy. Vì vậy editor kiểm tra giúp và **gạch đỏ** phần sai, kèm dòng giải thích dưới ô. Ví dụ:

| Bạn gõ | Báo |
|---|---|
| `{{result('')}}` | `result` cần 1 giá trị bắt buộc: ID của khối |
| `{{result('abc')}}` khi không có khối `abc` đứng trước | Khối 'abc' không tồn tại hoặc không nằm trước khối này |
| `{{var('x')}}` khi chưa khối nào đặt tên biến tạm `x` | Biến 'x' không tồn tại hoặc chưa được khai báo |
| `{{user.nme}}` | Không có trường 'nme'. Ý bạn là 'name'? |
| `{{upperr(user.name)}}` | Hàm 'upperr' không tồn tại. Ý bạn là 'upper'? |
| `{{user.id}}` trong flow lịch chạy | 'user' không dùng được trong loại flow này |
| `{{1 +}}` | Biểu thức chưa hoàn chỉnh |

Lỗi chỉ mang tính cảnh báo, không chặn lưu. Phần kiểm tra trường và hàm chạy ở máy chủ sau khi bạn ngừng gõ khoảng nửa giây; nếu không kết nối được, các kiểm tra tại chỗ (như `result('')`) vẫn hoạt động. Trường của `result('id')` không bị kiểm tra, vì kết quả của mỗi khối khác nhau.

## Liên quan

- [Tính biểu thức](/reference/blocks/actions/action_expression_evaluate) — khối chạy biểu thức nhiều dòng
- [Biến lưu trữ](/reference/variable) — nguồn dữ liệu bền vững cho biểu thức
- [Lệnh tùy chỉnh](/reference/command) — đọc đối số bằng `arg('tên')`
- [Các khối](/reference/blocks/) — tham chiếu kết quả khối trước bằng `result('id')`
