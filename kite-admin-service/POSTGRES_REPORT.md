# Báo cáo: PostgreSQL Database Schema — Kite Project

> **Nguồn:** `kite-service/internal/db/postgres/`  
> **Công cụ:** [sqlc](https://sqlc.dev/) (code generation từ SQL), [golang-migrate](https://github.com/golang-migrate/migrate) (migration)  
> **Tổng số bảng:** 17 bảng + 1 bảng chưa có pgmodel (payment_sessions)

---

## Sơ đồ quan hệ tổng quát

```
users
 ├── sessions
 ├── subscriptions
 │    └── entitlements ──────────────────────────────────┐
 ├── apps (owner_user_id)                                 │
 │    ├── entitlements ◄──────────────────────────────────┘
 │    ├── collaborators ◄── users
 │    ├── modules
 │    │    ├── commands
 │    │    │    ├── usage_records
 │    │    │    └── resume_points
 │    │    ├── event_listeners
 │    │    │    ├── usage_records
 │    │    │    └── resume_points
 │    │    ├── messages
 │    │    │    ├── message_instances
 │    │    │    │    └── resume_points
 │    │    │    └── usage_records
 │    │    ├── variables
 │    │    │    └── variable_values
 │    │    └── assets
 │    ├── plugin_instances
 │    │    └── plugin_values
 │    ├── logs
 │    └── payment_sessions
```

---

## Chi tiết từng bảng

### 1. `users` — Người dùng

**Migration:** `001_create_users_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `email` | TEXT | UNIQUE, NOT NULL |
| `display_name` | TEXT | NOT NULL |
| `discord_id` | TEXT | UNIQUE, NOT NULL |
| `discord_username` | TEXT | NOT NULL |
| `discord_avatar` | TEXT | Nullable — URL avatar Discord |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Mô tả:** Bảng trung tâm lưu tài khoản người dùng. Xác thực qua Discord OAuth. Mỗi user có thể sở hữu nhiều app, là collaborator của nhiều app khác, và có subscription riêng.

---

### 2. `sessions` — Phiên đăng nhập

**Migration:** `002_create_sessions_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `key_hash` | TEXT | PK — hash của session token |
| `user_id` | TEXT | FK → users(id) CASCADE DELETE |
| `created_at` | TIMESTAMP | NOT NULL |
| `expires_at` | TIMESTAMP | NOT NULL |

**Mô tả:** Quản lý session dạng stateful. Token thực tế không lưu trong DB mà chỉ lưu hash (bảo mật). Session tự hết hạn theo `expires_at`.

---

### 3. `apps` — Ứng dụng Discord Bot

**Migration:** `003`, `012`, `014`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | Nullable |
| `enabled` | BOOLEAN | Default TRUE |
| `owner_user_id` | TEXT | FK → users(id) RESTRICT DELETE |
| `creator_user_id` | TEXT | NOT NULL (không FK — lịch sử) |
| `discord_token` | TEXT | Bot token Discord |
| `discord_id` | TEXT | UNIQUE — Application ID trên Discord |
| `discord_status` | JSONB | Trạng thái hiện tại của bot trên Discord |
| `disabled_reason` | TEXT | Nullable — lý do bị vô hiệu hóa |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `apps_owner_user_id`

**Mô tả:** Mỗi App tương ứng một Discord Bot. Lưu token để Kite có thể kết nối và điều khiển bot. `discord_status` dạng JSONB lưu trạng thái realtime (online/offline, lỗi kết nối...).

---

### 4. `collaborators` — Cộng tác viên

**Migration:** `004_create_collaborators_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `user_id` | TEXT | PK + FK → users(id) RESTRICT DELETE |
| `app_id` | TEXT | PK + FK → apps(id) CASCADE DELETE |
| `role` | TEXT | NOT NULL — vai trò trong app |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `collaborators_user_id`, `collaborators_app_id`  
**Khóa chính:** `(user_id, app_id)` — composite PK

**Mô tả:** Cho phép nhiều người dùng cùng quản lý một app với các vai trò khác nhau (RBAC).

---

### 5. `modules` — Module

**Migration:** `006_create_modules_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL |
| `enabled` | BOOLEAN | Default FALSE |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `creator_user_id` | TEXT | NOT NULL |
| `resources` | JSONB | Danh sách resource của module |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Mô tả:** Module là đơn vị tổ chức logic trong một app — có thể nhóm commands, event listeners, messages, variables, assets. Mặc định disabled khi tạo.

---

### 6. `commands` — Slash Command

**Migration:** `007_create_commands_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL |
| `enabled` | BOOLEAN | Default FALSE |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `module_id` | TEXT | FK → modules(id) SET NULL on delete |
| `creator_user_id` | TEXT | NOT NULL |
| `flow_source` | JSONB | Định nghĩa flow xử lý lệnh |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |
| `last_deployed_at` | TIMESTAMP | Nullable — lần cuối deploy lên Discord |

**Index:** `commands_app_id`, `commands_module_id`

**Mô tả:** Mỗi command là một slash command trên Discord. `flow_source` (JSONB) định nghĩa toàn bộ logic xử lý dạng visual flow graph. `last_deployed_at` theo dõi trạng thái sync với Discord API.

---

### 7. `event_listeners` — Trình lắng nghe sự kiện

**Migration:** `015_create_event_listeners_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `source` | TEXT | Nguồn event (discord, ...) |
| `type` | TEXT | Loại event (message_create, member_join, ...) |
| `description` | TEXT | NOT NULL |
| `enabled` | BOOLEAN | Default FALSE |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `module_id` | TEXT | FK → modules(id) SET NULL |
| `creator_user_id` | TEXT | NOT NULL |
| `filter` | JSONB | Nullable — điều kiện lọc event |
| `flow_source` | JSONB | Logic xử lý khi event xảy ra |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `event_listeners_app_id`, `event_listeners_module_id`

**Mô tả:** Lắng nghe các sự kiện Discord (tin nhắn mới, thành viên join, reaction...) và thực thi flow tương ứng. `filter` JSONB cho phép lọc theo điều kiện trước khi trigger flow.

---

### 8. `messages` — Message Template

**Migration:** `010_create_messages_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | Nullable |
| `data` | JSONB | Nội dung tin nhắn Discord |
| `flow_sources` | JSONB | Map flow_source_id → flow object |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `module_id` | TEXT | FK → modules(id) SET NULL |
| `creator_user_id` | TEXT | NOT NULL |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `messages_app_id`, `messages_module_id`

**Mô tả:** Template tin nhắn có thể tái sử dụng. `data` chứa nội dung Discord message (embed, components, buttons...). `flow_sources` chứa logic tương tác (xử lý button click, select menu...) — một message có thể có nhiều flow.

---

### 9. `message_instances` — Tin nhắn đã gửi

**Migration:** `011_create_message_instances_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `message_id` | TEXT | FK → messages(id) CASCADE DELETE |
| `hidden` | BOOLEAN | Default FALSE |
| `ephemeral` | BOOLEAN | Default FALSE — chỉ người gửi thấy |
| `discord_guild_id` | TEXT | NOT NULL |
| `discord_channel_id` | TEXT | NOT NULL |
| `discord_message_id` | TEXT | UNIQUE — ID thực tế trên Discord |
| `flow_sources` | JSONB | Snapshot flow tại thời điểm gửi |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `message_instances_message_id`

**Mô tả:** Mỗi lần một message template được gửi lên Discord → tạo một instance. Lưu `flow_sources` dạng snapshot để resume_points có thể tham chiếu đúng logic khi user interact sau này.

---

### 10. `variables` — Biến lưu trữ

**Migration:** `008_create_variables_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `scoped` | BOOLEAN | Default FALSE — có phạm vi theo scope không |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `module_id` | TEXT | FK → modules(id) SET NULL |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Unique:** `(app_id, name)`  
**Index:** `variables_app_id`, `variables_module_id`

**Mô tả:** Định nghĩa biến có thể dùng trong flow. Nếu `scoped = true`, mỗi scope (user, guild, channel...) có giá trị riêng; nếu `false`, là biến toàn cục của app.

---

### 11. `variable_values` — Giá trị biến

**Migration:** `009_create_variable_values_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `variable_id` | TEXT | FK → variables(id) CASCADE DELETE |
| `scope` | TEXT | Nullable — guild/user/member/channel ID hoặc custom |
| `value` | JSONB | Giá trị thực tế |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Unique:** `(variable_id, scope)` NULLS NOT DISTINCT  
**Index:** `variable_values_variable_id`, `variable_values_scope`

**Mô tả:** Lưu giá trị thực của biến. `scope = NULL` là giá trị global. `scope = "guild:123"` là giá trị riêng cho guild đó. Dùng JSONB để lưu mọi kiểu dữ liệu (string, number, object...).

---

### 12. `assets` — Tài nguyên nhị phân

**Migration:** `013_create_assets_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `name` | TEXT | Tên file gốc |
| `content_hash` | TEXT | Hash nội dung — key trong MinIO |
| `content_type` | TEXT | MIME type |
| `content_size` | INTEGER | Kích thước (bytes) |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `module_id` | TEXT | FK → modules(id) SET NULL |
| `creator_user_id` | TEXT | NOT NULL |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |
| `expires_at` | TIMESTAMP | Nullable — TTL tự động xóa |

**Index:** `assets_app_id`, `assets_module_id`, `assets_content_hash`

**Mô tả:** Chỉ lưu metadata trong PostgreSQL. Nội dung nhị phân thực tế lưu trong MinIO bucket `kite-assets`, với key = `content_hash`. Xem thêm báo cáo MinIO.

---

### 13. `logs` — Nhật ký hệ thống

**Migration:** `005`, `019`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `message` | TEXT | Nội dung log |
| `level` | TEXT | `info`, `warn`, `error`... |
| `created_at` | TIMESTAMP | NOT NULL |
| `command_id` | TEXT | FK → commands(id) SET NULL |
| `event_listener_id` | TEXT | FK → event_listeners(id) SET NULL |
| `message_id` | TEXT | FK → messages(id) SET NULL |

**Index:** `logs_app_id`, `logs_command_id`, `logs_event_listener_id`, `logs_message_id`

**Mô tả:** Log runtime của các flow khi thực thi. Các cột `command_id`, `event_listener_id`, `message_id` cho biết log phát sinh từ nguồn nào để dễ lọc.

---

### 14. `usage_records` — Lịch sử sử dụng tài nguyên

**Migration:** `016_create_usage_records_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `type` | TEXT | Loại usage |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `command_id` | TEXT | FK → commands(id) SET NULL |
| `event_listener_id` | TEXT | FK → event_listeners(id) SET NULL |
| `message_id` | TEXT | FK → messages(id) SET NULL |
| `credits_used` | INTEGER | Số credit tiêu thụ |
| `created_at` | TIMESTAMP | NOT NULL |

**Index:** tất cả FK columns

**Mô tả:** Ghi nhận mỗi lần flow được thực thi và số credit tiêu hao. Phục vụ billing, quota enforcement và analytics sử dụng.

---

### 15. `resume_points` — Điểm tiếp tục flow

**Migration:** `020_create_resume_points_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `type` | TEXT | Loại resume point |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `command_id` | TEXT | FK → commands(id) SET NULL |
| `event_listener_id` | TEXT | FK → event_listeners(id) SET NULL |
| `message_id` | TEXT | FK → messages(id) SET NULL |
| `message_instance_id` | BIGINT | FK → message_instances(id) SET NULL |
| `flow_source_id` | TEXT | Nullable — ID flow cụ thể (message có nhiều flow) |
| `flow_node_id` | TEXT | Node đang chờ trong flow graph |
| `flow_state` | JSONB | Toàn bộ state của flow tại điểm dừng |
| `created_at` | TIMESTAMP | NOT NULL |
| `expires_at` | TIMESTAMP | Nullable — TTL |

**Index:** tất cả FK columns

**Mô tả:** Cơ chế "checkpoint" cho async flow. Khi flow đang chờ user phản hồi (click button, nhập form...), trạng thái được lưu tại đây. Khi user tương tác, hệ thống tải lại `flow_state` và tiếp tục từ `flow_node_id`.

---

### 16. `plugin_instances` — Instance Plugin

**Migration:** `023_create_plugin_instances_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `plugin_id` | TEXT | ID định danh loại plugin |
| `enabled` | BOOLEAN | Default FALSE |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `creator_user_id` | TEXT | NOT NULL |
| `config` | JSONB | Cấu hình riêng của plugin instance |
| `enabled_resource_ids` | TEXT[] | Danh sách resource ID được bật |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |
| `last_deployed_at` | TIMESTAMP | Nullable |

**Unique:** `(plugin_id, app_id)` — mỗi app chỉ có 1 instance mỗi loại plugin  
**Index:** `plugin_instances_app_id`, `plugin_instances_plugin_id`

**Mô tả:** Mỗi plugin (tính năng mở rộng) khi được kích hoạt cho một app sẽ tạo một instance. `config` chứa cấu hình đặc thù của plugin đó.

---

### 17. `plugin_values` — Giá trị lưu trữ của Plugin

**Migration:** `024_create_plugin_values.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `plugin_instance_id` | TEXT | FK → plugin_instances(id) CASCADE DELETE |
| `key` | TEXT | NOT NULL |
| `value` | JSONB | NOT NULL |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Unique:** `(plugin_instance_id, key)`  
**Index:** `plugin_values_plugin_instance_id`, `plugin_values_plugin_instance_key`

**Mô tả:** Key-value store riêng cho mỗi plugin instance. Plugin dùng để persist trạng thái nội bộ mà không cần tạo bảng riêng.

---

### 18. `subscriptions` — Gói đăng ký

**Migration:** `021_create_subscriptions_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `display_name` | TEXT | Tên hiển thị gói |
| `source` | TEXT | Provider: `lemonsqueezy` |
| `status` | TEXT | `on_trial`, `active`, `paused`, `past_due`, `unpaid`, `canceled`, `expired` |
| `status_formatted` | TEXT | Chuỗi hiển thị đã format |
| `user_id` | TEXT | FK → users(id) CASCADE DELETE |
| `renews_at` | TIMESTAMP | NOT NULL |
| `trial_ends_at` | TIMESTAMP | Nullable |
| `ends_at` | TIMESTAMP | Nullable |
| `lemonsqueezy_subscription_id` | TEXT | UNIQUE — ID phía Lemonsqueezy |
| `lemonsqueezy_customer_id` | TEXT | Nullable |
| `lemonsqueezy_order_id` | TEXT | Nullable |
| `lemonsqueezy_product_id` | TEXT | Nullable |
| `lemonsqueezy_variant_id` | TEXT | Nullable |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |

**Index:** `subscriptions_user_id`

**Mô tả:** Quản lý subscription của người dùng qua Lemonsqueezy (payment gateway). Các trường `lemonsqueezy_*` lưu ID tham chiếu sang hệ thống bên ngoài để xử lý webhook.

---

### 19. `entitlements` — Quyền sử dụng gói

**Migration:** `022_create_entitlements_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `type` | TEXT | `subscription` hoặc `manual` |
| `subscription_id` | TEXT | FK → subscriptions(id) CASCADE DELETE (Nullable) |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `plan_id` | TEXT | ID gói dịch vụ |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |
| `ends_at` | TIMESTAMP | Nullable — khi hết hạn |

**Unique:** `(subscription_id, app_id)`  
**Index:** `entitlements_subscription_id`, `entitlements_app_id`

**Mô tả:** Ghi nhận một app đang được hưởng quyền lợi của gói nào. `type = "subscription"` liên kết với subscription thật; `type = "manual"` là cấp quyền thủ công (admin grant).

---

### 20. `payment_sessions` — Phiên thanh toán

**Migration:** `026_create_payment_sessions_table.up.sql`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT | PK |
| `provider` | TEXT | Provider thanh toán |
| `payment_id` | TEXT | UNIQUE — ID giao dịch nội bộ |
| `app_id` | TEXT | FK → apps(id) CASCADE DELETE |
| `plan_id` | TEXT | Gói muốn mua |
| `amount` | INTEGER | Số tiền (đơn vị nhỏ nhất của tiền tệ) |
| `qr_image_url` | TEXT | URL ảnh QR code thanh toán |
| `qr_content` | TEXT | Nội dung QR (chuỗi) |
| `status` | TEXT | Trạng thái thanh toán |
| `provider_transaction_id` | TEXT | Nullable — ID giao dịch phía provider |
| `raw_webhook_payload` | TEXT | Nullable — payload webhook thô từ provider |
| `created_at` | TIMESTAMP | NOT NULL |
| `updated_at` | TIMESTAMP | NOT NULL |
| `paid_at` | TIMESTAMP | Nullable — thời điểm thanh toán thành công |

**Index:** `payment_sessions_app_id`, `payment_sessions_status`  
**Unique index:** `(provider, provider_transaction_id)` WHERE `provider_transaction_id IS NOT NULL`

**Mô tả:** Lưu phiên thanh toán QR code cho một app nâng cấp lên plan cao hơn. Hỗ trợ cơ chế webhook từ provider để cập nhật trạng thái.

---

## Tổng kết theo nhóm

| Nhóm | Bảng |
|---|---|
| **Auth & User** | `users`, `sessions` |
| **App & Collaboration** | `apps`, `collaborators` |
| **Flow Logic** | `modules`, `commands`, `event_listeners`, `messages`, `message_instances`, `resume_points` |
| **Storage** | `variables`, `variable_values`, `assets` |
| **Plugin** | `plugin_instances`, `plugin_values` |
| **Observability** | `logs`, `usage_records` |
| **Billing** | `subscriptions`, `entitlements`, `payment_sessions` |

---

## Ghi chú kỹ thuật

- **Code generation:** Toàn bộ Go code trong `pgmodel/` được sinh tự động bởi `sqlc` từ các file SQL trong `queries/`. Không sửa tay các file này.
- **Migration tool:** `golang-migrate` — chạy tuần tự theo số thứ tự (001 → 026). Mỗi migration có file `.up.sql` (apply) và `.down.sql` (rollback).
- **JSONB usage:** Nhiều bảng dùng JSONB để lưu dữ liệu linh hoạt (`flow_source`, `flow_state`, `config`, `resources`, `value`...) — cho phép evolve schema của flow/config mà không cần migration DB.
- **Soft references:** Hầu hết FK dùng `ON DELETE CASCADE` (xóa app → xóa toàn bộ data liên quan) hoặc `SET NULL` (xóa module → command vẫn còn nhưng `module_id = NULL`).
