---
sidebar_position: 53
---

import EmbedFlowNode from "../../../../src/components/EmbedFlowNode";
import NodeInfoExplorer from "../../../../src/components/NodeInfoExplorer";

# Tạo ảnh QR (VietQR)

<EmbedFlowNode type="action_qr_create" />

> Tạo link ảnh QR chuyển khoản VietQR từ thông tin tài khoản ngân hàng. Khối chỉ ghép URL — không gọi mạng, không kiểm tra URL.

## Khi nào dùng

- Nhận thanh toán / donate qua chuyển khoản ngân hàng.
- Tạo mã QR chuyển khoản động theo lệnh (số tiền, nội dung thay đổi theo người dùng).
- Gửi QR vào tin nhắn, embed hoặc tin nhắn riêng (DM).

## Cấu hình

> `Ngân hàng` — ngân hàng nhận tiền, chọn từ danh sách (chỉ hiển thị các ngân hàng VietQR hỗ trợ). **Bắt buộc.**
>
> `Số tài khoản` — số tài khoản nhận tiền. **Bắt buộc.**
>
> `Số tiền` — số tiền cần chuyển. Để trống để người chuyển tự nhập.
>
> `Nội dung chuyển khoản` — nội dung hiển thị khi chuyển.
>
> `Mẫu ảnh QR` — `Mặc định`, `Compact`, `Chỉ mã QR`, hoặc `Standee` (dán quầy / in card).
>
> `Tên chủ tài khoản` và `Tên cửa hàng` — hiển thị kèm trên ảnh.
>
> `Ẩn thông tin tài khoản` — không hiển thị thông tin tài khoản trên ảnh (chỉ áp dụng QR online).
>
> `Hiện đầy đủ số tài khoản` — hiển thị toàn bộ số tài khoản thay vì che bớt.

Các ô số tiền, nội dung, tên chủ tài khoản, tên cửa hàng đều hỗ trợ biến `{{ ... }}`.

## Kết quả trả về

Đặt một `id` cho khối, rồi lấy link ảnh QR bằng `result('id')`. Đưa link này vào **ảnh** của embed hoặc tin nhắn để hiển thị mã QR.

## Ví dụ

Gửi QR chuyển khoản cho người chạy lệnh:
1. **Tạo ảnh QR (VietQR)**: chọn ngân hàng, nhập số tài khoản, đặt `Nội dung` = `{{ user.id }}`. Đặt `id` = `qr`.
2. **Phản hồi tin nhắn**: thêm một embed, đặt URL ảnh của embed = `{{ result('qr') }}`.

## Lưu ý & liên quan

- **Miễn phí** — không tốn credit (khối chỉ ghép chuỗi URL). Xem [Hệ thống credit](/reference/credit-system).
- Chỉ tạo link, **không kiểm tra** mã QR có tải được hay không; ảnh được render bởi VietQR khi tin nhắn hiển thị.
- [Gửi yêu cầu API](/reference/blocks/actions/action_http_request)
- [Tạo tin nhắn](/reference/blocks/actions/action_message_create)

<NodeInfoExplorer type="action_qr_create" />
