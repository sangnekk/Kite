Đây là dự án [Next.js](https://nextjs.org/) được khởi tạo bằng [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

Đã được việt hóa bởi [@sang0023](http://sang0023.io.vn/).

## Bắt đầu

Đầu tiên, chạy server phát triển:

```bash
npm run dev
# hoặc
yarn dev
# hoặc
pnpm dev
# hoặc
bun dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt để xem kết quả.

Bạn có thể bắt đầu chỉnh sửa trang bằng cách sửa file `pages/index.tsx`. Trang sẽ tự động cập nhật khi bạn chỉnh sửa.

[API routes](https://nextjs.org/docs/api-routes/introduction) có thể truy cập tại [http://localhost:3000/api/hello](http://localhost:3000/api/hello). Endpoint này có thể chỉnh sửa trong `pages/api/hello.ts`.

Thư mục `pages/api` được ánh xạ tới `/api/*`. Các file trong thư mục này được xử lý như [API routes](https://nextjs.org/docs/api-routes/introduction) thay vì trang React.

Dự án này sử dụng [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) để tự động tối ưu và tải Inter, một Google Font tùy chỉnh.

## Tìm hiểu thêm

Để tìm hiểu thêm về Next.js, hãy xem các tài nguyên sau:

- [Tài liệu Next.js](https://nextjs.org/docs) - tìm hiểu về tính năng và API của Next.js.
- [Học Next.js](https://nextjs.org/learn) - hướng dẫn tương tác về Next.js.

Bạn có thể xem [kho GitHub của Next.js](https://github.com/vercel/next.js/) - phản hồi và đóng góp của bạn được hoan nghênh!

## Triển khai trên Vercel

Cách dễ nhất để triển khai ứng dụng Next.js là sử dụng [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) từ những người tạo ra Next.js.

Xem [tài liệu triển khai Next.js](https://nextjs.org/docs/deployment) để biết thêm chi tiết.
