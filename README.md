# 🪁 Vibe Bot - Dựa trên [Kite](https://kite.onl/) | [GitHub](https://github.com/sangnekk/Kite)

[![Release](https://github.com/sangnekk/Kite/actions/workflows/release.yaml/badge.svg)](https://github.com/sangnekk/Kite/releases)
[![Docker image](https://github.com/sangnekk/Kite/actions/workflows/docker-push.yaml/badge.svg)](https://hub.docker.com/r/merlintor/kite)

[![Release](https://img.shields.io/github/v/release/sangnekk/Kite)](https://github.com/sangnekk/Kite/releases/latest)
[![MIT License](https://img.shields.io/github/license/sangnekk/Kite)](LICENSE)
[![Discord Server](https://img.shields.io/discord/845800518458540083)](https://discord.gg/rNd9jWHnXh)

Tạo Bot Discord của riêng bạn với Vibe Bot miễn phí mà không cần viết một dòng code nào. Hỗ trợ slash command, nút bấm, sự kiện, và nhiều hơn nữa.

Đã được việt hóa bởi [@sang0023](http://sang0023.io.vn/).

![Ví dụ Flow](./example-flow.png)

Dự án này vẫn đang trong quá trình phát triển và chưa có đầy đủ tính năng. Chỉ một số phần của Discord API được hỗ trợ và logic phức tạp vẫn khó triển khai.

## Tự host

Đây là cách đơn giản nhất để tự host một phiên bản Vibe Bot bằng cách sử dụng một file binary duy nhất chứa cả backend và frontend.

Bạn có thể tìm các bản build sẵn của server kèm file frontend [tại đây](https://github.com/sangnekk/Kite/releases/latest).

Để chạy Vibe Bot, bạn cũng cần chạy một server [Postgres](https://www.postgresql.org/) song song, vì vậy nên sử dụng `docker-compose` để đơn giản hóa quy trình.

### Cấu hình server

Để cấu hình server, bạn có thể tạo file `kite.toml` với các trường sau:

```toml
[discord]
client_id = "..." # ID ứng dụng Discord dùng cho Oauth2
client_secret = "..." # Secret ứng dụng Discord dùng cho Oauth2

[encryption]
token_encryption_key = "..." # Khóa AES mã hóa HEX để mã hóa Discord token
```

Để tạo khóa mã hóa cho token, bạn có thể dùng `openssl enc -aes-256-cbc -k secret -P -md sha1`.

Bạn cũng có thể đặt giá trị cấu hình qua biến môi trường. Ví dụ `KITE_DISCORD__CLIENT_ID` sẽ đặt client id của Discord.

### Sử dụng Docker (docker-compose)

Cài đặt Docker và docker-compose rồi tạo file docker-compose.yaml với nội dung sau:

```yaml
services:
  postgres:
    image: postgres
    restart: always
    volumes:
      - kite-local-postgres:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_DB: kite
      PGUSER: postgres
      PGDATA: /var/lib/postgresql/data/pgdata
      POSTGRES_HOST_AUTH_METHOD: trust
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 3s
      timeout: 30s
      retries: 3

  minio:
    image: quay.io/minio/minio
    command: server --console-address ":9001" /data
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: kite
      MINIO_ROOT_PASSWORD: 1234567890
    volumes:
      - kite-local-minio:/data

  kite:
    image: merlintor/kite:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      - KITE_API__HOST=0.0.0.0
      - KITE_DATABASE__POSTGRES__HOST=postgres
      - KITE_DATABASE__POSTGRES__USER=postgres
      - KITE_DATABASE__POSTGRES__DB_NAME=kite
      - KITE_DATABASE__S3__ENDPOINT=minio:9000
      - KITE_DATABASE__S3__ACCESS_KEY_ID=kite
      - KITE_DATABASE__S3__SECRET_ACCESS_KEY=1234567890
      - KITE_DATABASE__S3__SECURE=false
      - KITE_APP__PUBLIC_BASE_URL=http://localhost:8080
      - KITE_API__PUBLIC_BASE_URL=http://localhost:8080
    volumes:
      - ./kite.toml:/root/kite.toml
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  kite-local-postgres:
  kite-local-minio:
```

Chạy file bằng `docker-compose up`. Nó sẽ tự động mount file `kite.toml` vào container. Bạn không nên cấu hình postgres trong file config vì nó sử dụng instance postgres từ container.

Vibe Bot sẽ có thể truy cập trong trình duyệt tại [localhost:8080](http://localhost:8080).

### Build từ mã nguồn

#### Build website

Bạn có thể tải NodeJS và NPM từ [nodejs.org](https://nodejs.org/en/download/).

```shell
# Chuyển đến thư mục kite-web
cd kite-web

# Cài đặt dependencies
npm install

# Chạy server phát triển (tùy chọn)
npm run dev

# Build để nhúng vào kite-service (khuyến nghị)
OUTPUT=export npm run build

# Build để sử dụng độc lập
npm run build
```

#### Build tài liệu

Bạn có thể tải NodeJS và NPM từ [nodejs.org](https://nodejs.org/en/download/).

```shell
# Chuyển đến thư mục kite-docs
cd kite-docs

# Cài đặt dependencies
npm install

# Chạy server phát triển (tùy chọn)
npm run start

# Build cho môi trường production
npm run build
```

#### Build server (kite-service)

Cài đặt Go >=1.22 từ [go.dev](https://go.dev/doc/install).

```shell
# Chuyển đến thư mục backend
cd kite-service
# hoặc nếu bạn đang ở thư mục kite-web / kite-docs
cd ../kite-service

# Cấu hình server (xem các bước ở trên)

# Chạy migration cơ sở dữ liệu
go run main.go database migrate postgres up

# Chạy server phát triển (tùy chọn)
go run main.go server

# Build và nhúng file kite-web vào binary backend (build website trước)
go build --tags  "embedweb"

# Build không nhúng file frontend vào binary backend (bạn cần tự serve chúng)
go build
```

## Tiến độ tổng quan

- [x] Slash Commands
  - [x] Sub Commands
  - [x] Placeholder cơ bản
  - [x] Placeholder nâng cao
- [x] Mẫu tin nhắn (MVP)
  - [x] Embed
  - [x] Tệp đính kèm
  - [x] Thành phần tương tác
  - [x] Placeholder cơ bản
  - [x] Placeholder nâng cao
- [x] Bộ lắng nghe sự kiện
- [x] Biến lưu trữ
  - [x] Hạ tầng cơ bản
  - [x] Kết nối biến với lệnh
