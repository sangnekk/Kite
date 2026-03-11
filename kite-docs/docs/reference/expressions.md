---
sidebar_position: 5
---

# Biểu thức

Vibe Bot hỗ trợ tính toán và biến đổi dữ liệu bằng biểu thức. Biểu thức có thể dùng trong khối `Evaluate Expression` (**hỗ trợ cả nhập nhiều dòng**) và trong mọi placeholder được bao bởi `{{` và `}}`.

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

Ngoài ra còn có một số hàm đặc biệt để truy cập dữ liệu động:

```py
arg('name') # Access value of a command argument
input('identifier') # Access value of a modal input
result('id') # Access the result of a previous block
```

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
