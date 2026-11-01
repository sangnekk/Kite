# Biểu thức `{{ }}` trong flow: nơi cần cập nhật

Dành cho contributor và AI sửa code. Các ô của khối (tên, nội dung, ID...) cho phép viết biểu thức trong `{{ }}`, chạy bằng thư viện [expr](https://expr-lang.org) ở backend. Có **ba nơi cùng biết "biểu thức có những gì"** và chúng không tự đồng bộ. Khi thêm hoặc đổi một giá trị, một hàm hay một khối, hãy cập nhật cả ba, nếu không người dùng sẽ thấy gợi ý thiếu hoặc bị báo lỗi oan.

## 1. Môi trường chạy thật (nguồn sự thật)

`kite-service/pkg/eval/ctx.go` (`NewContextFromInteraction`, `NewContextFromEvent`, `NewContextFromTextCommand`, `NewContextForSchedule`, `NewContextFromInternalEvent`) và `kite-service/pkg/flow/*.go` (thêm `result`, `var`, `node`, `item`, `index`, `option`, `select` khi chạy).

Lưu ý quan trọng: `eval.Eval` dùng `expr.AllowUndefinedVariables()`, nên **tên gõ sai không báo lỗi lúc chạy mà ra giá trị rỗng**. Đó là lý do có bước kiểm tra bên dưới.

## 2. Bộ kiểm tra phía server (báo lỗi khi đang gõ)

`kite-service/pkg/eval/check.go`, gọi qua `POST /v1/apps/{appID}/expressions/check` (`internal/api/handler/expression`).

Khi thêm:

| Thay đổi | Sửa ở `check.go` |
|---|---|
| Giá trị mới ở môi trường chạy (ví dụ `thread`) | thêm vào `rootsByContext` cho đúng loại flow; nếu có cấu trúc cố định thì thêm kiểu vào `checkEnv` và `shapeTypes` / `shapeNames` để kiểm tra từng trường |
| Hàm mới của flow (như `result`) | thêm vào `flowFunctions` |
| Giá trị mà flow engine thêm lúc chạy (như `item`) | thêm vào `flowValues` |
| Loại flow mới | thêm hằng `CheckContext...` và mục trong `rootsByContext`; tên khớp `FlowContextType` ở `kite-web/src/lib/flow/context.ts` |
| Thêm field `expr:"..."` vào struct như `UserEnv` | không cần sửa, danh sách trường đọc từ tag bằng reflect |

Nếu quên, người dùng sẽ thấy lỗi **"không tồn tại"** hoặc **"không dùng được trong loại flow này"** cho một giá trị hợp lệ. Có test trong `check_test.go`: thêm một ca cho giá trị mới.

Không dùng lookbehind trong regex ở phía web (Safari cũ không tải được file). Offset trả về tính theo **đơn vị UTF-16**, khớp chỉ số chuỗi JavaScript.

## 3. Gợi ý và kiểm tra tại chỗ trong editor

`kite-web/src/lib/flow/`:

- `expressionModel.ts`: danh sách giá trị gốc (`ROOT_MEMBERS`), hàm (`FUNCTIONS`) và hàm đọc trường kết quả từ schema zod của khối (`membersOfSchema`). Các trường lấy theo struct `expr:"..."` ở `pkg/eval/ctx.go`.
- `expressionEngine.ts`: code thuần, không có UI: `completeAt`, `applyCompletion` (gợi ý) và `diagnose` (kiểm tra `result('id')`, `var('tên')`, `arg('tên')`, `input('id')` với những gì flow đang có). Có test `expressionEngine.test.ts`.
- `src/components/flow/FlowPlaceholderExplorer.tsx`: `useFlowCompletionContext` đọc các khối đứng trước để biết có `result`, `var`, `arg`, `input` nào.
- `src/components/common/PlaceholderInput.tsx`: ô nhập, tô đỏ và hiện thông báo; `src/lib/hooks/expressionCheck.ts` gọi server (đợi 600 ms, nhớ kết quả theo văn bản).

Khi thêm khối mới có `resultSchema` (trong `src/lib/flow/resultSchema.ts` và `nodes.ts`), gợi ý trường `result('id').` tự có, không cần làm gì thêm.

## Kiểm tra sau khi sửa

```
cd kite-service && go test ./pkg/eval/ ./internal/api/...
cd kite-web && npx tsc --noEmit && bun test src
```

Giao diện nên xem bằng trình duyệt thật (không chỉ test): tạo một trang thử tạm gắn `FlowPage` với một flow nhỏ rồi chụp bằng Chrome headless.

## Ghi chú khác

- Giới hạn tần suất: nhóm `/apps` chung chỉ cho 60 lượt/phút mỗi người dùng. Route kiểm tra biểu thức nằm nhóm riêng (300/phút) để việc gõ phím không ăn hết hạn mức của các API khác. Đừng gộp nó lại vào `appGroup`.
- Kiểu dữ liệu sinh sẵn `kite-web/src/lib/types/*.gen.ts` đang cũ so với tygo; hãy **thêm tay** kiểu mới thay vì chạy lại toàn bộ (chạy lại sẽ làm hỏng chỗ khác).
