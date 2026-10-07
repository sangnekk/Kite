# Implementation Plan — Discord Select Menu

> Trạng thái: **đã có triển khai P0, P1, P2 và một phần P3; chưa nghiệm thu Discord thật**. Thiết kế ban đầu dựa trên commit `593a30e`; tiến độ đối chiếu working tree sau `31523c1`.
> Nguyên tắc ưu tiên: **Reuse kiến trúc hiện tại > Discord API đúng > UX no-code đơn giản > maintainability > extensibility.**
> Select Menu **không** phải một subsystem mới. Nó là một loại interactive component mới, đi qua cùng dispatcher, cùng flow engine và cùng cơ chế binding với Button.

---

## Tiến độ đã kiểm chứng

- P0 dispatcher/dedupe đã commit trong `31523c1`; không còn ở trạng thái "chưa commit".
- P1/P2 đã có code backend/frontend và unit test: 5 loại select, snapshot, access, resolved entities, option handles, preview.
- P3 đã có code: nhánh `_unselected`, option động, for-each, reset lựa chọn, log component, TTL cleanup. Chưa coi toàn bộ P3 hoàn tất; DnD và usage type riêng vẫn là tùy chọn.
- Resume từ schedule đã có `ScheduleID` và migration `037_select_menus`, thay cho hạn chế được ghi ở phần thiết kế cũ.
- Đã bổ sung reference `entry_component_select`, regenerate catalog AI/docs, sửa prompt AI để hỗ trợ context select và handle theo option.
- `go test ./...` trong `kite-service` pass; frontend TypeScript pass; assert check prompt AI pass.
- Migration 001–036 rồi 037 up/down/up pass trên PostgreSQL 17 cô lập. Check chạy lại: `python kite-service/scripts/check_select_migration.py` từ root. Không áp dụng vào DB ứng dụng.
- Test QR cũ đã đồng bộ với hành vi ưu tiên ẩn thông tin tài khoản; không thay runtime QR.
- **Còn mở:** nghiệm thu bot thật và thao tác UI trong server test, snapshot/update tin đã gửi, access, multi-select và Button regression. Các checkbox phía dưới vẫn là checklist nghiệm thu; không tự đánh dấu chỉ vì có code.
- Catalog generator còn báo các block khác thiếu docs hoặc docs orphan; ngoài phạm vi Select Menu.

---

## 0. Tóm tắt điều hành

| Hạng mục | Kết luận |
|---|---|
| Binding | **Một flow cho mỗi Select Menu.** Entry node mới `entry_component_select` có **một output handle cho mỗi option** (bind theo *option ID nội bộ*, không theo value) và một output mặc định "Mọi lựa chọn". Không dùng mô hình "mỗi option một flow riêng". |
| Dispatcher | Tổng quát hóa `case *discord.ButtonInteraction` thành `case discord.ComponentInteraction` trong `engine/app.go`. Button và Select dùng chung 2 đường resolve đã có: **message instance** (template) và **resume point** (message inline trong flow). |
| custom_id | Giữ nguyên hai format đang dùng: `flow_source_id` (template) và `resume:<rpID>_<compID>` (inline). Không thêm bảng mapping. |
| Versioning | Giữ **snapshot** (Cách B) như Button hiện tại. Bổ sung snapshot `message_data` vào `message_instances` để có thể map value → option. |
| Biến | Thêm `select.*` (values, value, options, users, roles, channels, mentionables…) và `option.*` (chỉ có trong nhánh của option), cùng `interaction.component.*`. |
| Phase | **P0**: refactor dispatcher (sửa luôn bug của Button) → **P1**: String Select end-to-end → **P2**: User/Role/Channel/Mentionable + access control → **P3**: nâng cao. |

---

## 1. Phân tích kiến trúc hiện tại

### 1.1 Bản đồ luồng Button hiện tại (Select sẽ đi theo cùng đường)

Hiện có **hai đường** để gắn hành động vào component. Select Menu phải hỗ trợ cả hai.

**Đường A: Message Template (tin nhắn được lưu ở dashboard)**

```
Dashboard: Message editor (MessageComponentButton / MessageV2Editor.ButtonEditor)
  └─ mỗi button có flow_source_id  →  FlowSources[flow_source_id] = flow (entry_component_button)
Save:   PUT message  →  wire.MessageUpdateRequest.Sanitize() (prune flow không dùng qua WalkComponents)
Send:   HandleMessageInstanceCreate  (dashboard)          ┐
        hoặc action_response_create/message_create        ├→ message_instances { discord_message_id, flow_sources (SNAPSHOT) }
        với message_template_id → LinkMessageTemplateInstance ┘
Convert: MessageData.ToSendMessageData(ConvertOptions{})  → custom_id = flow_source_id
Click:  engine/app.go HandleEvent → *discord.ButtonInteraction
        → không phải "resume:" → MessageInstanceByDiscordMessageID
        → NewMessageInstance (compile từng FlowSource bằng CompileComponentButton)
        → flows[custom_id] → env.executeFlowEvent
```

**Đường B: Message inline trong flow (component nằm trong `message_data` của node)**

```
Flow editor: action_response_create/edit, action_message_create/edit, private_message_create
  FlowNodeActionMessage.tsx vẽ 1 handle "component_<compID>" cho mỗi button
Execute: prepareMessageResponseData / prepareMessageSendData
  → resumePointID = util.UniqueID();  custom_id = "resume:<rpID>_<compID>"
  → ctx.suspend(ResumePointTypeMessageComponents, rpID, node.ID)   (lưu FlowState)
Click:  app.go → DecodeCustomIDMessageComponentResumePoint → ResumePointStore
        → (chỉ xử lý resumePoint.CommandID!) → command.flow.FindChildWithID(node)
        → executeFlowEvent(node, state)  → node.IsEntry() → resumeFromComponent
        → ExecuteChildrenByHandle("component_<compID>")
```

### 1.2 Các thành phần liên quan

| Khu vực | File | Ghi chú |
|---|---|---|
| Message model | `kite-service/pkg/message/data.go` | `ComponentData` là struct kiểu union, **đã có** `Placeholder/MinValues/MaxValues/Options`. `ComponentSelectOptionData` **không có `Value`** và có `FlowSourceID`, một di sản của mô hình mỗi option một flow. |
| Convert → Discord | `pkg/message/convert.go:219` `toComponent` | Có case cho Button và các loại V2. **Không có case Select**, nên select trả về `nil` và bị loại khỏi action row mà không báo lỗi. |
| Copy | `pkg/message/copy.go` | Đã copy `Options`. |
| Template string | `data.go:146` `eachString` | Đã template `Placeholder`, cùng `Label`/`Description` của option. |
| Dispatcher | `internal/core/engine/app.go:184` | Chỉ có `*discord.ButtonInteraction` và `*discord.ModalInteraction`. |
| Message instance runtime | `internal/core/engine/message.go` | Cast cứng sang `*discord.ButtonInteraction`. |
| Resume | `pkg/flow/execute.go:2863` `resumeFromComponent` | `interaction.Data.(*discord.ButtonInteraction)` là type assertion **không kiểm tra**, nên gặp select sẽ **panic** (được `recoverPanic` bắt lại, nhưng user chỉ thấy "Interaction failed"). |
| Flow compile | `pkg/flow/compile.go` | `CompileComponentButton`, `IsEntry()`. |
| Flow execute entry | `execute.go:43` | `case FlowNodeTypeEntryCommand, FlowNodeTypeEntryComponentButton` chạy chung: bot-permission gate, auto-defer, rồi children. |
| Auto defer | `execute.go:2839` + `providers.go:509` | Sau 1.5s mà chưa phản hồi thì defer **type 5** (`DeferredMessageInteractionWithSource`), có xét ephemeral của response node kế tiếp. |
| Eval / biến | `pkg/eval/ctx.go` | `interaction.*`, `user`, `member`, `channel`, `guild`, `arg()`, `input()`. `NewComponentsEnv` chỉ đọc Modal. |
| Condition | `execute.go:2385` | Có compare (`equal`, `contains`…), user/channel/role (`has_role`, `has_permission`). `Thing.Contains` (`thing.go:696`) so sánh **chuỗi**, không xét phần tử mảng. |
| Loop | `execute.go:2582` | `control_loop` chỉ đếm số lần, **không có for-each**. `action_list_format` đã có pattern bind `item`/`index` tạm thời. |
| Response nodes | `execute.go:237–400` | `action_response_create` (reply/followup, ephemeral), `action_response_edit` với target `@original`. Khi chưa phản hồi thì dùng `UpdateMessage` (type 7), tức sửa đúng tin nhắn chứa component. |
| Lưu trữ | migrations `011_message_instances`, `020_resume_points` | `discord_message_id UNIQUE` nên lookup nhanh. Resume point loại `message_components` **không bao giờ hết hạn** (có TODO ở `providers.go:1089`). |
| Log/usage | `engine/helpers.go` `createLogEntry`, `createUsageRecord` | Gắn link `CommandID/EventListenerID/MessageID/ScheduleID`. |
| Plugins | `engine/plugin.go:85` | Nhận **mọi** `ComponentInteraction`. Cả 3 plugin (`counting`, `spamcatcher`, `starboard`) đều có `HandleComponent` rỗng. |
| arikawa (vendored, `replace => ../arikawa`) | `discord/component.go`, `interaction.go` | Có đủ `String/User/Role/Channel/MentionableSelectComponent` và `…SelectInteraction`. Các `…SelectInteraction` **không parse `resolved`**. |
| Frontend schema | `kite-web/src/lib/message/schema.ts:265` | `selectMenuSchema` (type 3) chưa có `value`, `default`, `min_values`, `max_values` và chưa hỗ trợ entity select. `actionRowSchema` cho phép trộn button với select. |
| Frontend store | `lib/message/messageStore.ts` | **Đã có** action cho select (`addSelectMenuOption`, `move…`, `duplicate…`, `setSelectMenuPlaceholder`…), kế thừa từ embed-generator. Undo/redo dùng `zundo temporal`. |
| Frontend UI | `MessageComponentRow.tsx:131` | Hiện chữ *"select menus aren't supported yet"*. `MessageComponentsSection` chỉ có nút "Thêm hàng nút". V2 `ActionRowEditor` chỉ thêm được button. |
| Flow UI | `FlowNodeActionMessage.tsx` | Vẽ handle `component_<id>` cho button (có comment *"format has to match with the backend"*). |
| Flow context | `lib/flow/context.tsx`, `categories.ts` | `FlowContextType` gồm `"component_button"`, dùng để lọc node được phép. |
| Placeholder UI | `components/flow/FlowPlaceholderExplorer.tsx` | Gợi ý biến theo context và theo node cha. |
| Preview | `MessagePreview.tsx`, `MessageV2Preview.tsx` | Dùng `@skyra/discord-components-react@4.0.2`, **đã có `DiscordStringSelectMenu` và `DiscordStringSelectMenuOption`**. |
| AI / docs | `kite-web/scripts/gen-flow-catalog.ts`, `gen-flow-docs.ts` → `kite-ai-service/src/generated/*.json`; `kite-docs/docs/reference/blocks/entries/entry_component_button.md` | Phải regenerate sau khi thêm node. |

### 1.3 Lỗ hổng và bug phát hiện được (một số là bug có sẵn của Button)

| # | Vấn đề | Ảnh hưởng |
|---|---|---|
| G1 | `convert.go` không có case select | Select bị bỏ mà không báo lỗi khi gửi |
| G2 | Dispatcher chỉ nhận `ButtonInteraction` | Select interaction bị bỏ qua, Discord hiện "Interaction failed" |
| G3 | `resumeFromComponent` assert cứng kiểu Button | Panic với select |
| G4 | **Bug có sẵn:** resume của component chỉ xử lý `CommandID` | Button inline gửi từ **event listener**, **flow của message template** hay **schedule** đều chết im lặng |
| G5 | Mọi nhánh "not found" đều `return` | User nhận "Interaction failed" mà không có giải thích |
| G6 | Auto-defer luôn dùng type 5 | Với component interaction, flow không có response hoặc flow edit tin nhắn gốc sẽ để lại tin "Bot đang suy nghĩ…" hoặc edit nhầm tin |
| G7 | `MinValues int` có `omitempty` | Không biểu diễn được `min_values = 0` (lựa chọn tùy chọn) |
| G8 | Option không có `Value` | Không có giá trị nội bộ để bot nhận |
| G9 | `Thing.Contains` so chuỗi | `values contains "role_a"` cũng khớp `"role_ab"` |
| G10 | `message_instances` chỉ snapshot `flow_sources` | Không map được value → option theo đúng phiên bản đã gửi |
| G11 | `duplicate` button/row sinh `flow_source_id` mới nhưng **không copy flow** | Bản sao mất hành động (bug có sẵn, select cũng sẽ gặp) |
| G12 | arikawa select interaction không có `resolved` | Không có tên hay avatar của user/role/channel được chọn |

---

## 2. Tái sử dụng từ hệ thống Button

| Thành phần Button | Select tái sử dụng thế nào | Thay đổi cần làm |
|---|---|---|
| `ComponentData` (union struct) | Giữ nguyên, chỉ thêm field | `Value`, `*int` min/max, `ChannelTypes`, `DefaultValues` |
| `flow_source_id` + `FlowSources` + `Sanitize()` | Mỗi select có 1 `flow_source_id` | Không đổi. `WalkComponents` đã duyệt tới select |
| `ConvertOptions.ComponentIDFactory` | Dùng nguyên cho select | Gọi factory trong `toSelect*` |
| `message_instances` lookup | Giữ nguyên | Thêm cột `message_data` snapshot |
| Resume point `message_components` | Giữ nguyên format `resume:<rp>_<comp>` | Tổng quát hóa để resolve mọi loại link |
| `executeFlowEvent`, `flowContext`, log, usage | Giữ nguyên | Không đổi |
| Entry case chung (bot-perm gate + auto-defer) | `entry_component_select` được thêm vào cùng case | Chọn loại defer theo loại interaction |
| `ExecuteChildrenByHandle` | Dùng cho handle theo option | Không đổi |
| `FlowNodeActionMessage` handles | Thêm handle cho select và cho từng option | Handle ID theo quy ước mới (§11) |
| `FlowDialog` + `FlowContextType` | Thêm context `"component_select"` | Cho phép các category đang có `"component_button"` |
| `messageStore` select actions + zundo | Tái dùng. Undo/redo có sẵn | Thêm các setter còn thiếu |
| `MessageEmojiPicker`, `MessageInput`, `MessageCollapsibleSection`, validation path | Tái dùng nguyên | Không đổi |
| `@skyra` preview | Dùng `DiscordStringSelectMenu` | Không đổi |

Không tạo: bảng DB riêng cho select, dispatcher riêng, workflow engine riêng, hệ thống response riêng.

---

## 3. Discord Select Menu model và phân phase các loại

| Type | Tên | Nguồn giá trị | Payload interaction | Phase |
|---|---|---|---|---|
| 3 | String Select | option tĩnh (1–25) | `values: string[]` | **P1** |
| 5 | User Select | Discord tự cung cấp danh sách | `values: UserID[]` + `resolved.users/members` | P2 |
| 6 | Role Select | Discord | `values: RoleID[]` + `resolved.roles` | P2 |
| 8 | Channel Select | Discord (lọc qua `channel_types`) | `values: ChannelID[]` + `resolved.channels` | P2 |
| 7 | Mentionable Select | Discord (user + role) | `values: Snowflake[]` + `resolved.users/roles` | P2 |

**Vì sao ưu tiên String Select:** phục vụ trường hợp phổ biến nhất (menu sản phẩm, ticket, role picker có nhãn đẹp). Đây cũng là loại duy nhất cần option editor và bind hành động theo option, tức phần khó nhất về UX. Khi String Select chạy được, 4 loại còn lại chỉ cần thêm converter, env biến và panel cấu hình nhỏ.

**Kiến trúc dùng chung giữa 5 loại:** cùng `ComponentData`, cùng `flow_source_id`, cùng entry node, cùng dispatcher, cùng `select.values`. Chỉ khác ở: (a) String Select có `options` và handle theo option; (b) các Entity Select có `default_values`, riêng channel có thêm `channel_types`, và có biến entity đã resolve.

**Giới hạn Discord cần enforce** (kiểm lại với docs Discord khi code):
- `custom_id` ≤ 100 ký tự; `placeholder` ≤ 150.
- `min_values` từ 0 đến 25 (mặc định 1); `max_values` từ 1 đến 25 (mặc định 1); `min ≤ max`.
- String select: 1–25 option; `max_values ≤ số option`. Option `label`, `value`, `description` mỗi trường ≤ 100 ký tự; `value` **duy nhất** trong menu; số option `default` ≤ `max_values`.
- Entity select: số `default_values` nằm trong `[min, max]`.
- **Một Action Row chỉ chứa đúng 1 select** và **không được** trộn với button. Legacy message có tối đa 5 action row. Components V2 cho phép đặt action row (kể cả row có select) trong container.

---

## 4. Data model

### 4.1 Backend (`pkg/message/data.go`)

**Hiện tại → Vấn đề:** thiếu `Value`; `MinValues int` không biểu diễn được 0 (G7); chưa có field riêng cho entity select.

**Đề xuất.** Giữ `ComponentData` dạng union vì nó phản chiếu JSON của Discord và đồng nhất với Button/V2. Tách hai nhóm "Static Option Select" và "Entity Select" ở tầng **helper, converter và validation**, không tách struct:

```go
// Select Menu (3 string, 5 user, 6 role, 7 mentionable, 8 channel)
Placeholder   string                      `json:"placeholder,omitempty"`
MinValues     *int                        `json:"min_values,omitempty"` // *int: 0 là giá trị hợp lệ
MaxValues     *int                        `json:"max_values,omitempty"`
Options       []ComponentSelectOptionData `json:"options,omitempty"`        // chỉ string select
ChannelTypes  []int                       `json:"channel_types,omitempty"`  // chỉ channel select
DefaultValues []ComponentDefaultValueData `json:"default_values,omitempty"` // chỉ entity select

type ComponentSelectOptionData struct {
    ID          int                 `json:"id,omitempty"`    // ID nội bộ: bind handle, reorder, rename
    Label       string              `json:"label,omitempty"`
    Value       string              `json:"value,omitempty"` // MỚI: giá trị bot nhận, không template
    Description string              `json:"description,omitempty"`
    Emoji       *ComponentEmojiData `json:"emoji,omitempty"`
    Default     bool                `json:"default,omitempty"`
    // Deprecated: mô hình mỗi option một flow; không dùng. Giữ để JSON cũ vẫn parse được.
    FlowSourceID string `json:"flow_source_id,omitempty"`
}

type ComponentDefaultValueData struct {
    ID   string `json:"id"`   // snowflake hoặc template, ví dụ {{user.id}}
    Type string `json:"type"` // "user" | "role" | "channel"
}

func (c *ComponentData) IsSelect() bool       // 3,5,6,7,8
func (c *ComponentData) IsStringSelect() bool // 3
func (c *ComponentData) IsEntitySelect() bool // 5,6,7,8
func (c *ComponentData) FindComponentByID(id int) *ComponentData
func (c *ComponentData) OptionByValue(v string) (*ComponentSelectOptionData, int)
```

**Lý do:** đổi `int` sang `*int` vẫn tương thích JSON với dữ liệu cũ (số vẫn parse được) và phần code tham chiếu rất ít. Tách struct thành interface đa hình sẽ phải viết custom unmarshal cho toàn bộ cây component V2, chi phí cao mà không có lợi ích runtime.

- `eachString`: thêm template cho `DefaultValues[].ID`. **Không** template `Option.Value` ở P1 (xem §15).
- `copy.go`: copy thêm `Value`, các con trỏ `Min/Max`, `ChannelTypes`, `DefaultValues`.

**Files:** `pkg/message/data.go`, `copy.go`, `helpers.go`. Sau đó hand-add type vào `kite-web/src/lib/types/message.gen.ts` (**không** chạy full tygo, xem memory: file gen đã stale).

### 4.2 Frontend (`kite-web/src/lib/message/schema.ts` và `schemaRestore.ts`)

Dùng discriminated union để tách rõ hai nhóm:

```ts
const selectBase = {
  id, flow_source_id,
  placeholder: z.string().max(150).optional(),
  min_values: z.number().int().min(0).max(25).optional(),
  max_values: z.number().int().min(1).max(25).optional(),
  disabled: z.boolean().optional(),
  access: componentAccessSchema.optional(),            // P2, xem §13
};
export const selectOptionSchema = z.object({
  id, label: z.string().min(1).max(100), value: z.string().min(1).max(100),
  description: z.string().max(100).optional(), emoji: emojiSchema.optional(),
  default: z.boolean().optional(),
});
export const stringSelectSchema = z.object({ ...selectBase, type: z.literal(3),
  options: z.array(selectOptionSchema).min(1).max(25) }).superRefine(stringSelectRules);
export const entitySelectSchema = z.object({ ...selectBase,
  type: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8)]),
  default_values: z.array(defaultValueSchema).max(25).optional(),
  channel_types: z.array(z.number()).optional(),       // chỉ hợp lệ khi type 8
}).superRefine(entitySelectRules);
export const selectMenuSchema = z.union([stringSelectSchema, entitySelectSchema]);

// Row: HOẶC 1–5 button, HOẶC đúng 1 select (enforce layout Discord)
export const actionRowSchema = z.object({ id, type: z.literal(1),
  components: z.union([z.array(buttonSchema).min(1).max(5), z.array(selectMenuSchema).length(1)]) });
```

`schemaRestore.ts` (dùng để khôi phục backup) cần bổ sung tương ứng theo dạng lỏng hơn.

### 4.3 Database

**Hiện tại:** `message_instances(flow_sources jsonb)` chỉ snapshot flow.
**Đề xuất:** migration `037_add_message_instance_data`:

```sql
ALTER TABLE message_instances ADD COLUMN message_data JSONB; -- nullable: instance cũ = NULL
```

Ghi snapshot ở `HandleMessageInstanceCreate/Update` (`api/handler/message/instances.go`) và `LinkMessageTemplateInstance` (`engine/providers.go:1036`). Khi `NULL` thì fallback sang `Message.Data` mới nhất (Button không cần field này).

**Lý do:** runtime cần biết option nào tương ứng với value nào, và cấu hình access của component, **theo đúng phiên bản mà người dùng Discord đang nhìn thấy**. Không cần bảng mới.

**Files:** `internal/db/postgres/migrations/037_*.sql`, `queries/messages.sql` (chạy sqlc), `store_message.go`, `internal/model/message.go` (`MessageInstance.MessageData *message.MessageData`), `internal/store/message.go`.

---

## 5. Builder UX

### 5.1 Thêm Select Menu

**Hiện tại:** `MessageComponentsSection` chỉ có "Thêm hàng nút"; row chứa select hiện "not supported".

**Đề xuất (legacy editor):**

```
Thành phần                                   [ Dùng Components V2 ○ ]
┌ Hàng 1 · Nút ─────────────────────────────── ↑ ↓ ⧉ 🗑 ┐
│ [Nút 1] [Nút 2]                    [+ Thêm nút] (≤5)   │
└────────────────────────────────────────────────────────┘
┌ Hàng 2 · Menu chọn ──────────────────────────  ↑ ↓ ⧉ 🗑 ┐
│ ⓘ Menu chọn chiếm trọn một hàng.                        │
│ <SelectMenuEditor/>                                     │
└────────────────────────────────────────────────────────┘
[ + Thêm thành phần ▾ ]   → Hàng nút | Menu chọn        (disabled khi đủ 5 hàng)
```

- Chọn "Menu chọn" sẽ **tự tạo một row mới** chứa đúng 1 select: String Select, 1 option mẫu, `min = max = 1`. Người dùng không bao giờ phải tự tạo row.
- Row chứa select không hiện nút "Thêm nút". Row chứa button không có cách nào thêm select vào. Vì vậy **không thể tạo layout sai**.
- Tiêu đề row ghi rõ loại ("Nút" / "Menu chọn") thay cho `isButtonRow` ngầm định.
- V2 editor: thêm `{ label: "Menu chọn", type: "select_row" }` vào `ADDABLE`. Mục này tạo `{type:1, components:[select]}` và `ActionRowEditor` render `SelectMenuEditor` khi row chứa select.

### 5.2 SelectMenuEditor (component dùng chung cho legacy và V2)

```
┌ Menu chọn ───────────────────────────────────────────────┐
│ Loại            [ Danh sách tùy chỉnh (String) ▼ ]         │
│                   Người dùng / Vai trò / Kênh / Người+Vai trò│
│ Placeholder     [ Chọn một sản phẩm...            ] 0/150  │
│ Số lựa chọn     Tối thiểu [ 1 ]  Tối đa [ 1 ]              │
│                 ⓘ "Người dùng phải chọn đúng 1 mục"        │
│ Vô hiệu hóa     [ ○ ]                                      │
├──────────────────────────────────────────────────────────┤
│ (String)  <OptionListEditor/>                              │
│ (Entity)  Mặc định chọn sẵn  [ + Thêm ]                     │
│ (Channel) Loại kênh cho phép ☑Văn bản ☑Thoại ☐Danh mục ... │
├──────────────────────────────────────────────────────────┤
│ Hành động khi chọn   [ Mini flow preview — bấm để mở ]    │
│   • Mọi lựa chọn: 2 hành động                              │
│   • 🖥 VPS: 1 hành động   • 🌐 Hosting: chưa có ⚠          │
├──────────────────────────────────────────────────────────┤
│ Ai được dùng (P2)  ○ Mọi người ○ Vai trò… ○ Quyền… ○ Người kích hoạt│
└──────────────────────────────────────────────────────────┘
```

- Câu giải thích min/max được sinh tự động: `min=max=1` → "chọn đúng 1"; `min=0` → "có thể bỏ trống"; `1–3` → "chọn từ 1 đến 3".
- Đổi loại từ String sang Entity khi đã có option: hiện confirm *"Các lựa chọn và nhánh hành động theo lựa chọn sẽ bị xóa"*. Nhánh "Mọi lựa chọn" được giữ.
- Khi ở inline mode (`disableFlowEditor`, tức message nằm trong flow node) thì ẩn khối "Hành động", thay bằng ghi chú *"Nối hành động từ các chấm trên khối tin nhắn trong flow"*, giống cách Button inline đang làm.

**Files:** mới `components/message/MessageComponentSelectMenu.tsx`, `MessageSelectOption.tsx`; sửa `MessageComponentRow.tsx`, `MessageComponentsSection.tsx`, `MessageV2Editor.tsx`; store `lib/message/messageStore.ts` (thêm `addSelectMenuRow`, `setSelectMenuType`, `setSelectMenuMinValues/MaxValues`, `setSelectMenuOptionValue/Default`, `setSelectMenuDefaultValues`, `setSelectMenuChannelTypes`; đổi các guard `type !== 3` thành `isSelect()`).

### 5.3 Drag & drop

**Hiện tại:** builder không có thư viện DnD; việc sắp xếp dùng mũi tên ↑↓ (row, button, option).
**Đề xuất:** P1 **giữ ↑↓** cho row và option. Constraint được đảm bảo bởi cấu trúc store (§5.1), không phụ thuộc DnD. P3 (tùy chọn) mới thêm `@dnd-kit` và dùng chung một pure function `canPlace(component, targetRow)` làm drop validator, để UI có DnD hay không thì luật layout vẫn là một chỗ duy nhất.
**Lý do:** DnD là chi phí lớn (thư viện, a11y, test) và không cần để đúng layout Discord.

---

## 6. Option Editor UX (String Select)

```
Lựa chọn (3/25)                                   [ Xóa tất cả ]
┌ ▸ 🖥 Mua VPS   `buy_vps`   ✓Mặc định           ↑ ↓ ⧉ 🗑 ┐
└──────────────────────────────────────────────────────────┘
┌ ▾ 🌐 Hosting   `hosting`   ⚠                   ↑ ↓ ⧉ 🗑 ┐
│  Emoji [🌐]  Nhãn (người dùng thấy) [ Hosting        ] 7/100 │
│  Giá trị (bot nhận, không hiển thị) [ hosting        ] 7/100 │
│  Mô tả                              [ Web hosting    ]      │
│  Chọn sẵn mặc định                  [ ○ ]                   │
│  Hành động: chưa có  → [ Mở luồng tại nhánh này ]           │
└──────────────────────────────────────────────────────────┘
[ + Thêm lựa chọn ]   (disabled ở 25)
```

| Tính năng | Hành vi |
|---|---|
| Label vs Value | Hai nhãn có ghi chú rõ: **"Nhãn: người dùng thấy"** và **"Giá trị: bot nhận được, dùng trong `{{select.value}}`"**. |
| Auto value | Khi người dùng nhập label lần đầu, value tự sinh dạng slug (`Mua VPS` → `mua_vps`, bỏ dấu tiếng Việt) **cho đến khi người dùng tự sửa value**. Theo dõi bằng flag UI-only `value_touched` (không lưu). |
| Reorder | ↑↓ (store đã có `moveSelectMenuOptionUp/Down`). Handle trong flow bind theo `option.id` nên reorder không làm đứt binding. |
| Duplicate | `id` mới; value thêm hậu tố `_2`, `_3`… để giữ tính duy nhất. **Không** copy nhánh hành động; option mới có trạng thái "chưa có hành động". |
| Delete | Xóa option. Edge từ handle `option_<id>` sẽ bị prune khi đóng hoặc lưu flow (§10.4). Có undo qua zundo. |
| Validation | Hiện inline qua `validationPath` như các field khác (§14). |
| Default | Toggle. Nếu số default vượt `max_values` thì báo lỗi ngay. Preview hiện option default là "đã chọn". |
| Emoji | Dùng lại `MessageEmojiPicker` (hỗ trợ unicode và custom emoji). |
| Giới hạn | Bộ đếm `n/25`, bộ đếm ký tự cho label/value/description. |
| Header thu gọn | emoji + label + badge `value` + marker ⚠ lấy từ `MessageValidationErrorMarker`. |

---

## 7. Discord preview

**Hiện tại:** `MessagePreview` chỉ render button; `MessageV2Preview` không có select.
**Đề xuất:**
- Legacy: trong `DiscordActionRow`, thêm nhánh `comp.type === 3` → `<DiscordStringSelectMenu placeholder disabled>` với các `<DiscordStringSelectMenuOption label description emoji selected={default}>`. Entity select render cùng component: placeholder cộng một danh sách giả (ví dụ "👤 Thành viên server…", "🎭 Vai trò…", "# kênh…") và nhãn nhỏ *"Danh sách do Discord cung cấp"*.
- V2: render tương tự trong nhánh action row của `MessageV2Preview`.
- Preview là **tĩnh**: mở/đóng dropdown để xem được, không chạy interaction.
- Phải thể hiện đúng: placeholder (hoặc label của các option default nếu có), emoji, description, trạng thái default và disabled (mờ, không mở được).
- Kiểm tra API prop của `@skyra/discord-components-react@4.0.2` (`DiscordStringSelectMenu`, `…Option`). Nếu thiếu prop emoji/description thì viết component preview nhỏ riêng theo style Discord.

**Files:** `MessagePreview.tsx`, `MessageV2Preview.tsx`, có thể thêm `components/message/MessagePreviewSelectMenu.tsx`.

---

## 8. Action / workflow binding (quyết định kiến trúc)

### 8.1 So sánh ba phương án

| Tiêu chí | A. Mỗi option một flow (dạng `Option.FlowSourceID` cũ) | B. Một flow + so sánh `select.value` | **C. Một flow + handle theo option (đề xuất)** |
|---|---|---|---|
| Multi-select | Mơ hồ: chạy N flow song song, N lần defer, N lần tính credit | Tốt | Tốt: mỗi option được chọn chạy nhánh của nó, trong **một** execution |
| Logic dùng chung (defer, cooldown, check quyền) | Phải lặp lại ở N flow | Viết một lần | Viết một lần ở nhánh "Mọi lựa chọn" |
| UX no-code | Dễ | Kém: phải gõ value vào condition, coupling bằng chuỗi | Dễ: kéo dây từ chấm "🖥 VPS" |
| Đổi value hoặc label | Không ảnh hưởng | **Đứt** logic nếu đổi value | Không ảnh hưởng: bind theo `option.id` |
| Nhất quán với code hiện có | Không có runtime nào dùng | Có sẵn node condition | Đúng pattern `component_<id>` handle + `ExecuteChildrenByHandle` |
| Log, credits, usage | N bản ghi | 1 | 1 |

**Kết luận: phương án C.** Người dùng nâng cao vẫn dùng được B, vì `select.values` và các node condition hay list vẫn có sẵn.

### 8.2 Ngữ nghĩa thực thi

```
entry_component_select
 ├─ output mặc định  "Mọi lựa chọn"  → chạy 1 lần, TRƯỚC các nhánh option
 ├─ handle option_<id VPS>           → chạy nếu "buy_vps" ∈ values   (bind option = VPS)
 ├─ handle option_<id Hosting>       → chạy nếu "hosting" ∈ values
 └─ ...                                (thứ tự = thứ tự option trong cấu hình)
```

- Nhánh mặc định chạy trước để đặt setup chung (defer, cooldown, ghi biến) và để lỗi ở đó **dừng toàn bộ** execution (theo `traceError` có sẵn).
- Khi chạy nhánh option, bind tạm biến `option` (xem §9), rồi khôi phục sau đó. Làm theo pattern `item`/`index` của `action_list_format` (`execute.go:1865`).
- Entity select (5–8) không có option, nên chỉ có output mặc định.
- Handle không tồn tại thì bị bỏ qua (`ExecuteChildrenByHandle` đã trả `nil`).

### 8.3 Đường A (template), node mới

- `pkg/flow/data.go`: `FlowNodeTypeEntryComponentSelect = "entry_component_select"`.
- `compile.go`: thêm `CompileComponentSelect`, cập nhật `IsEntry()`, thêm `IsComponentSelectEntry()`. `NewMessageInstance` chọn compiler theo loại component (§12).
- `execute.go`: `case FlowNodeTypeEntryCommand, FlowNodeTypeEntryComponentButton, FlowNodeTypeEntryComponentSelect:` chạy phần chung (gate, defer), sau đó nếu là select thì gọi `n.executeSelectBranches(ctx, compConfig)`.
- `validate.go` `compileForEntry`: thêm case.
- Frontend: `lib/flow/nodes.ts` (icon `list`, tiêu đề "Menu chọn"), `components.ts` (node component mới `FlowNodeEntryComponentSelect.tsx` vẽ một handle cho mỗi option), `dataSchema.ts`, `flow.gen.ts` (hand-add), `context.tsx` (`"component_select"`), `categories.ts` (thêm `"component_select"` vào mọi `contextTypes` đang có `"component_button"`; cho phép `option_command_bot_permissions` trong context component vì `checkRequiredBotPermissions` đã chạy ở case chung).
- **Entry node lấy danh sách option ở đâu:** `FlowDialog` nhận thêm prop `componentOptions` và đưa vào `FlowContextStore` (thêm field). Node đọc từ store. Không lưu option vào flow data, nên không có hai nguồn dữ liệu bị lệch.

### 8.4 Đường B (inline trong flow node)

- `FlowNodeActionMessage.tsx`: với select, vẽ chip "▼ placeholder" có handle `component_<compID>` (mọi lựa chọn) và các chấm con `component_<compID>_option_<optID>`.
- `resumeFromComponent` (`execute.go:2863`): dùng `interaction.Data.(discord.ComponentInteraction)`. Nếu là select thì chạy handle `component_<compID>`, rồi các handle option theo §8.2. Cấu hình component lấy từ `n.Data.MessageData` qua `FindComponentByID`.

---

## 9. Variables và context được expose

**Hiện tại:** `interaction.{id,user,member,channel,guild,command,components}`, top-level `user/member/channel/guild/server/app`, `arg()`, `input()`.

**Đề xuất (`pkg/eval/ctx.go`):**

| Biến | Kiểu | String | User | Role | Channel | Mentionable |
|---|---|---|---|---|---|---|
| `interaction.component.custom_id` / `.type` | string/int | ✓ | ✓ | ✓ | ✓ | ✓ |
| `select.values` | list string (value hoặc ID) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `select.value` | string (phần tử đầu hoặc `""`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `select.count` | int | ✓ | ✓ | ✓ | ✓ | ✓ |
| `select.options` | list `{value,label,description}` | ✓ | | | | |
| `select.labels` | list string | ✓ | | | | |
| `select.users` / `select.members` | list UserEnv / MemberEnv | | ✓ | | | ✓ (phần là user) |
| `select.roles` | list RoleEnv | | | ✓ | | ✓ (phần là role) |
| `select.channels` | list ChannelEnv | | | | ✓ | |
| `select.mentionables` | list (User hoặc Role env) | | | | | ✓ |
| `option.value/label/description/index` | chỉ có trong nhánh option | ✓ | | | | |

- Biến `user`, `interaction.user.*`, `channel`, `guild` giữ nguyên (người **thao tác** menu).
- `NewContextFromInteraction`: nếu `Data` là một `…SelectInteraction` thì tạo `SelectEnv`. `select.options` và `select.labels` cần cấu hình, nên engine truyền vào một `optionLookup func(value string) *OptionInfo` sau khi resolve component (§12).
- **Resolved data (P2):** sửa arikawa vendored (`discord/interaction.go`) để thêm `Resolved` vào 4 struct entity select (`users`, `members`, `roles`, `channels`), rồi build env giống `NewCommandEnv` (ghép member với user). Nếu thiếu thì fallback `NewUserEnvFromID`/`NewChannelEnvFromID`. Ghi chú thay đổi này trong commit vì đây là fork.
- **List-friendly:** `select.values` phải chuyển được sang `thing` array để dùng với các node `action_list_*`. Viết test xác nhận `{{select.values}}` đi qua `EvalTemplate` ra `TypeArray`.
- **Sửa `Thing.Contains` (G9):** nếu `w` là mảng thì so sánh bằng từng phần tử. Nếu không phải mảng thì giữ hành vi chuỗi như cũ. Đây là điều kiện cần cho UX *"Danh sách đã chọn chứa `role_a`?"*.
- **Placeholder UI:** `FlowPlaceholderExplorer.tsx` thêm nhóm "Menu chọn" khi `contextType === "component_select"`, và khi node cha là message node có select (đường B). Trong nhánh option thì gợi ý thêm `option.*`.

**Files:** `pkg/eval/ctx.go`, `pkg/thing/thing.go`, `arikawa/discord/interaction.go` (P2), `FlowPlaceholderExplorer.tsx`, `kite-docs` (trang biến).

---

## 10. Multi-select flow

**Hiện tại:** không có cơ chế nào cho multi-select; `control_loop` chỉ đếm số lần; `Contains` so chuỗi.

**Đề xuất (ba mức, không cái nào giả định single-select):**
1. **Mặc định (no-code):** handle theo option (§8.2), mỗi option được chọn chạy nhánh riêng một lần. Đây chính là "for each" mà không cần node loop. Ví dụ role picker: nhánh "🎮 Gamer" → `action_member_role_add(role Gamer)`.
2. **Tổng hợp:** nhánh "Mọi lựa chọn" dùng `select.count`, `select.labels` với `action_list_join` → "Bạn đã chọn: Gamer, Artist".
3. **Điều kiện:** `control_condition_compare` với `select.values` `contains` `"role_a"` (cần sửa G9).
4. **P3, tùy chọn:** thêm chế độ `loop_items` cho `control_loop` (bind `item`/`index` như `action_list_format`) để duyệt `select.users` hoặc `select.roles` cho Entity Select nhiều giá trị.

**Tình huống "bỏ chọn" (min=0, role picker toggle):** Discord gửi **toàn bộ** tập đã chọn. Nhánh option chỉ chạy cho mục **đang được chọn**. Muốn gỡ role không còn chọn thì người dùng dùng nhánh "Mọi lựa chọn" kèm condition trên `select.values`. P3 có thể thêm handle "Khi KHÔNG chọn" cho từng option nếu nhu cầu cao.

### 10.4 Giữ flow sạch khi option thay đổi
Khi đóng `FlowDialog` hoặc lưu message, xóa các edge có `sourceHandle` là `option_<id>` hay `component_<c>_option_<id>` mà id không còn tồn tại. Làm trong `onFlowDialogClose` và trong action xóa option của store. Backend không cần làm gì: handle lạ sẽ bị bỏ qua.

---

## 11. custom_id strategy

| Đường | Format | Nguồn | Tính chất |
|---|---|---|---|
| Template | `<flow_source_id>` | `getUniqueId()` khi tạo component | Duy nhất trong message; không phụ thuộc label/value; ổn định qua các lần sửa |
| Inline | `resume:<rpID>_<compID>` | `util.UniqueID()` (nanoid 16 ký tự) + ID số nội bộ của component | Duy nhất toàn cục; khoảng 40 ký tự, dưới giới hạn 100 |
| Dự trữ | `p:<pluginID>:…` | cho plugin trong tương lai | Tránh va chạm với core |

- **Không đổi format của Button**, vì message đã gửi phải tiếp tục chạy.
- **Lookup:**
  - Template: `discord_message_id` (UNIQUE index) → instance → `flows[custom_id]` → component có `FlowSourceID == custom_id` trong `message_data`. Chỉ tốn một query và một lần tra map.
  - Inline: PK của `resume_points` → node → `FindComponentByID(compID)`.
- **Không có bảng mapping riêng**, vì chuỗi mapping `custom_id → component → flow` đã nằm sẵn trong instance và resume point.
- **Collision:** `flow_source_id` chỉ cần duy nhất trong một message, vì lookup luôn đi kèm discord message ID. Khi duplicate row, component hoặc select **phải** sinh `flow_source_id` mới **và copy flow sang id mới** (sửa G11 cho cả Button). Việc này làm trong `messageStore.duplicate*` kết hợp `flowStore.replaceFlow(newId, structuredClone(old))`.
- Option **không** có custom_id riêng. Discord trả `values`, runtime map value sang option.

---

## 12. Runtime handler architecture

### 12.1 Dispatcher tổng quát (`engine/app.go`)

```go
case discord.ComponentInteraction:          // Button + 5 loại Select
    a.handleComponentInteraction(appID, session, e, d)
case *discord.ModalInteraction:
    a.handleModalInteraction(...)          // dùng chung resolveResumeTarget
```

```
handleComponentInteraction
  1. dedupe(interaction.ID)                        // LRU ~5 phút; chống replay khi gateway reconnect
  2. if custom_id có dạng resume:
        rp  := ResumePointStore.ResumePoint(id)          ─ not found → respondUnavailable
        tgt := resolveResumeTarget(rp)                   ─ MỚI: xử lý CommandID | EventListenerID |
                                                           MessageInstanceID+FlowSourceID  (sửa G4)
        node := tgt.flow.FindChildWithID(rp.FlowNodeID)  ─ nil → respondUnavailable
        go executeFlowEvent(node, links, &rp.FlowState)
     else:
        inst := MessageInstanceByDiscordMessageID(e.Message.ID)   ─ not found → respondUnavailable
        comp := inst.componentByFlowSourceID(custom_id)            ─ lấy từ message_data snapshot
        flow := inst.flows[custom_id]                              ─ nil → respondUnavailable
        assert kind(flow entry) khớp kind(interaction)             ─ lệch → respondUnavailable + log
        go executeFlowEvent(flow, links, nil, comp)
```

- `MessageInstance.HandleEvent` (`engine/message.go`): nhận `discord.ComponentInteraction` và dùng `d.ID()`. Compile theo loại entry: flow có `entry_component_select` thì dùng `CompileComponentSelect`, còn lại dùng `CompileComponentButton`.
- Truyền cấu hình component vào flow: thêm field tùy chọn `Component *message.ComponentData` vào `FlowContext` (hoặc vào `InteractionData`) để entry và `resumeFromComponent` dùng cho map option và kiểm tra access.
- `respondUnavailable`: trả response ephemeral *"Menu/nút này không còn khả dụng."* bằng `session.RespondInteraction`. An toàn với plugin vì hiện tất cả `HandleComponent` đều rỗng. Khi plugin bắt đầu dùng component, chúng phải dùng prefix `p:`, và dispatcher core bỏ qua prefix đó.

### 12.2 Timeout và response (sửa G6)

Discord yêu cầu phản hồi trong 3 giây; token dùng được 15 phút.

| Tình huống | Response Discord | Nguồn |
|---|---|---|
| Node phản hồi đầu tiên là `action_response_create` | reply (type 4); nếu chậm hơn 1.5s thì auto-defer **type 5** (có cờ ephemeral nếu node ephemeral) rồi followup/edit | đã có |
| Node phản hồi đầu tiên là `action_response_edit` với `@original` | `UpdateMessage` (type 7); nếu chậm thì auto-defer **type 6** (`DeferredMessageUpdate`) rồi `EditInteractionResponse` sửa tin nhắn gốc | **mới** trong `autoDeferInteraction` |
| Không có node phản hồi ("chạy ngầm") | auto-defer **type 6**, là ack im lặng, không tạo tin "đang suy nghĩ…" | **mới** |
| `action_response_defer` tường minh | giữ type 5 như hiện tại; P3 thêm tùy chọn "Defer cập nhật tin nhắn" (type 6) | đã có |
| Phản hồi lần 2 trở đi | followup (`HasCreatedInteractionResponse`) | đã có |

Quy tắc chỉ áp dụng khi `interaction.Data` là `ComponentInteraction`, nên command giữ nguyên hành vi. Button cũng hưởng bản sửa này.

**Reset lựa chọn (P3, khuyến nghị):** Discord client giữ nguyên lựa chọn đã hiển thị, nên chọn lại cùng option sẽ không bắn interaction nữa. Thêm cờ `reset_on_select` (mặc định bật cho string select trong message template). Nếu flow không tự edit tin nhắn gốc thì engine gửi `EditInteractionResponse` với components y hệt để client reset.

**Files:** `engine/app.go`, `engine/message.go`, `engine/helpers.go` (links, component vào context), `pkg/flow/execute.go` (`resumeFromComponent`, `autoDeferInteraction`, `executeSelectBranches`), `pkg/flow/context.go`, `pkg/message/helpers.go`.

---

## 13. Permission và restrictions

**Hiện tại:** `option_command_permissions` được Discord enforce, chỉ áp dụng cho slash command. `control_condition_user/role` có `has_role`/`has_permission` bên trong flow. `option_command_bot_permissions` kiểm tra quyền của bot ở case entry chung. Component chưa có cơ chế gate.

**Vấn đề:** gate bằng condition bên trong flow không chặn được các nhánh option (chúng chạy sau). "Chỉ người gọi lệnh" cần ID người kích hoạt ban đầu, mà dữ liệu này hiện chưa được lưu.

**Đề xuất (P2, áp dụng cho cả Button và Select):**
- Thêm field `access` **trên component** (một nguồn cấu hình, dùng cho cả hai đường):
  ```go
  type ComponentAccessData struct {
      Mode        string   `json:"mode"`        // everyone | roles | permissions | invoker
      RoleIDs     []string `json:"role_ids,omitempty"`
      Permissions string   `json:"permissions,omitempty"` // bitfield
      DenyMessage string   `json:"deny_message,omitempty"`
  }
  ```
- Enforce tại **một chỗ**: `checkComponentAccess(ctx, comp)`, gọi ở entry chung và ở `resumeFromComponent`, **trước** auto-defer và **trước** mọi nhánh. Không đạt thì trả reply ephemeral `DenyMessage` (mặc định *"Bạn không có quyền dùng menu này."*) và dừng.
- Role và permission: tái dùng logic `has_role`/`has_permission` của `control_condition_item_user/role` (`execute.go:2461`), tách thành helper dùng chung.
- `invoker` (chỉ có ý nghĩa ở đường B): khi `ctx.suspend(...)` thì lưu `invoker_user_id` vào `FlowContextState` (field mới, `omitempty`). Resume point cũ không có field này nên fail-open, và ghi log debug.
- Điều kiện tùy biến: dùng condition node trong nhánh "Mọi lựa chọn" (có ghi chú UX rằng cách này không chặn nhánh option). P3 có thể thêm mode `expression` tái dùng kiểu `EventFilter` expression của custom event.
- Quyền của **bot** (Manage Roles…): cho phép `option_command_bot_permissions` trong context component (§8.3). Code đã chạy sẵn ở case chung.

**Files:** `pkg/message/data.go`, `pkg/flow/execute.go`, `pkg/flow/state.go`, frontend `schema.ts` và `SelectMenuEditor` (khối "Ai được dùng").

---

## 14. Validation

Validation chạy ở **ba lớp**, với cùng một bộ luật:

| Lớp | Nơi | Khi nào |
|---|---|---|
| Builder (real-time) | `schema.ts` superRefine → `validationStore` → `MessageValidationErrorMarker` | Mỗi thay đổi |
| API (chặn lưu) | `pkg/message/validate.go` (mới) → gọi trong `wire.MessageCreateRequest/UpdateRequest.Validate()` và trong `FlowNodeData.Validate` cho node có `message_data` | Save message / save flow |
| Runtime (phòng thủ) | `convert.go` | Component không hợp lệ gây `FlowError` rõ ràng (với đường template gửi từ dashboard thì trả lỗi 400), không bỏ qua im lặng |

**Luật:**
- Row: 1–5 button **hoặc** đúng 1 select; legacy ≤ 5 row.
- `placeholder` ≤ 150; `0 ≤ min ≤ max ≤ 25`; `max ≥ 1`.
- String: 1–25 option; label 1–100; value 1–100, **duy nhất**, **không chứa `{{`** (P1); description ≤ 100; `max ≤ số option`; `#default ≤ max`.
- Entity: `#default_values ∈ [min, max]` (khi có); `channel_types` chỉ hợp lệ với type 8 và phải thuộc danh sách hợp lệ.
- Binding: cảnh báo **mềm** (⚠, không chặn lưu) khi option chưa có hành động và nhánh "Mọi lựa chọn" cũng trống. Lý do: người dùng có thể muốn menu chỉ để ghi biến.

**Thông báo mẫu (tiếng Việt):**
- `⚠ Menu chọn cần ít nhất một lựa chọn.`
- `⚠ Lựa chọn "VPS" chưa có giá trị.`
- `⚠ Giá trị "vps" bị trùng với lựa chọn 1.`
- `⚠ Số lựa chọn tối đa (3) không được lớn hơn số lựa chọn hiện có (2).`
- `⚠ Có 2 lựa chọn được chọn sẵn nhưng tối đa chỉ cho chọn 1.`

---

## 15. Versioning của message và component

| | Cách A: luôn dùng config mới nhất | **Cách B: snapshot khi gửi (đề xuất, giữ nguyên)** |
|---|---|---|
| Nhất quán giữa thứ user thấy và thứ chạy | Không: tin cũ hiện option X nhưng config mới có thể đã xóa X | **Có** |
| Sửa hành vi hàng loạt | Tự động | Phải bấm "Cập nhật tin nhắn đã gửi". Tính năng này **đã có** (`HandleMessageInstanceUpdate` sửa đồng thời tin nhắn Discord và flow) |
| Hiện trạng code | Chỉ đường B (inline, resume) đang thực chất là A | Đường template hiện là B |

**Quyết định:**
- **Template:** giữ B. Mở rộng snapshot sang `message_data` (§4.3) để map value → option và đọc `access` theo đúng phiên bản đã gửi. Trên UI message editor, hiện số instance đã gửi kèm nút "Cập nhật tất cả" (tái dùng `MessageSendInstanceEntry`) và badge *"Có thay đổi chưa áp dụng cho N tin nhắn đã gửi"*.
- **Inline:** giữ hành vi hiện tại (flow command/listener mới nhất cùng `FlowState` đã lưu). Phòng lệch phiên bản bằng cách: node không còn thì báo "không còn khả dụng"; compID không còn trong `n.Data.MessageData` cũng báo "không còn khả dụng"; value không map được sang option thì bỏ nhánh option đó, **vẫn chạy nhánh "Mọi lựa chọn"**, và ghi log cảnh báo.
- **Không template `Option.Value` ở P1**, để value lưu trong config luôn bằng value Discord gửi về, và việc map luôn tất định. P3 có thể làm "option động" (từ list hoặc biến); khi đó danh sách option đã render phải được lưu vào `FlowState` của resume point.

---

## 16. Error handling

| # | Trường hợp | Runtime | Người dùng Discord thấy | Logging |
|---|---|---|---|---|
| 1 | custom_id không hợp lệ hoặc lạ | dừng | ephemeral "không còn khả dụng" | `slog.Debug` |
| 2 | Message instance bị xóa (tin nhắn bị xóa hoặc gỡ khỏi dashboard) | dừng | "không còn khả dụng" | `slog.Info` |
| 3 | Flow bị xóa, hoặc command/listener chứa resume point bị xóa | dừng | "không còn khả dụng" | LogStore **warn** (có link) |
| 4 | Option được chọn không còn trong config (chỉ xảy ra ở đường inline) | bỏ nhánh option đó, chạy nhánh chung | bình thường | LogStore warn: "giá trị `x` không khớp lựa chọn nào" |
| 5 | Tin nhắn cũ dùng config cũ | template: chạy theo snapshot; inline: xem §15 | bình thường hoặc "không còn khả dụng" | — |
| 6 | Nhánh option đã bị xóa khỏi flow | handle không tồn tại nên không làm gì; bị ack im lặng (type 6) | không có lỗi | — |
| 7 | User không đủ quyền (`access`) | dừng trước defer | ephemeral `DenyMessage` | `slog.Debug` (không spam LogStore) |
| 8 | Bot thiếu quyền | `checkRequiredBotPermissions` (đã có) báo quyền còn thiếu; nếu lỗi API 50013 thì chạy `createDefaultErrorResponse` | ephemeral báo lỗi | LogStore error |
| 9 | Discord API lỗi khác | `traceError` → `createDefaultErrorResponse` (đã có) | ephemeral "An error occurred…" | LogStore error kèm ngữ cảnh component (§17) |
| 10 | Role/channel được chọn đã bị xóa | Discord thường không cho chọn. Nếu action sau đó lỗi 404 thì xử lý như #9; người dùng có thể dùng `control_error_handler` | ephemeral lỗi | LogStore error |
| 11 | Interaction hết hạn (>3s mà chưa ack) | auto-defer ở 1.5s ngăn trường hợp này. Nếu vẫn lỗi 10062 thì bỏ | Discord hiện "Interaction failed" | `slog.Warn` "late interaction" (đã có check 500ms) |
| 12 | Interaction trùng (replay) | dedupe theo interaction ID (LRU 5 phút) | — | `slog.Debug` |
| 13 | Spam (chọn liên tục) | mỗi interaction chạy một flow; khuyến nghị template kèm `action_cooldown_check` theo user. Giới hạn credit/operation đã có (`MaxOperations`, `MaxCredits`) | theo cooldown | usage record như thường |
| 14 | Số values vượt `max_values` của config (config bị đổi ở đường inline) | cắt còn `max` và chạy tiếp | bình thường | LogStore warn |
| 15 | Loại interaction không khớp entry (ví dụ component đổi từ button sang select nhưng tin nhắn cũ vẫn còn) | dừng | "không còn khả dụng" | LogStore warn |
| 16 | Panic | `recoverPanic` (đã có) | "Interaction failed" | LogStore error |

---

## 17. Logging và analytics

**Hiện tại:** `createLogEntry` với các link; không có ngữ cảnh component; không log khi chạy thành công.

**Đề xuất:**
- **Lỗi:** thêm tiền tố ngữ cảnh vào message log: `[Menu "Chọn sản phẩm" · chọn: buy_vps] Failed to execute flow event: …`. Làm qua `entityLinks` mới có `ComponentLabel` và `SelectedValues`, chỉ dùng để format, **không đổi schema** `logs`.
- **Thành công:** **không** tự động ghi vào LogStore (tránh nhiễu, tốn dung lượng và credit). Người cần theo dõi dùng `action_log` với `{{user.name}} đã chọn {{select.labels}}`. Có thể thêm flow template mẫu. P3 có thể thêm app setting "Ghi log tương tác component".
- **slog (vận hành):** `app_id`, `interaction_id`, `component_kind`, `resolve_path` (template/resume), `result` (ok/unavailable/denied/error), `duration`.
- **Usage:** giữ `UsageRecordTypeCommandFlowExecution` với `MessageID` (đã có). Tùy chọn P3: thêm `component_flow_execution` để thống kê riêng.
- **Không log:** interaction token, toàn bộ payload, nội dung tin nhắn, dữ liệu resolved ngoài ID.

**Files:** `engine/helpers.go`, `engine/app.go`.

---

## 18. File và module cần thêm hoặc sửa

### Backend (`kite-service`)
| File | Thay đổi | Phase |
|---|---|---|
| `pkg/message/data.go` | `Value`, `*int` min/max, `ChannelTypes`, `DefaultValues`, `Access`; helper `IsSelect/…`, `FindComponentByID`, `OptionByValue`; template `DefaultValues` | P1/P2 |
| `pkg/message/copy.go` | copy field mới | P1 |
| `pkg/message/convert.go` | `toStringSelect`, `toEntitySelect` (5 loại), gọi `ComponentIDFactory`; action row nhận select | P1/P2 |
| `pkg/message/validate.go` (**mới**) | luật §14 | P1 |
| `pkg/message/convert_test.go`, `validate_test.go` | test | P1 |
| `pkg/flow/data.go` | `FlowNodeTypeEntryComponentSelect` | P1 |
| `pkg/flow/compile.go` | `CompileComponentSelect`, `IsEntry` | P1 |
| `pkg/flow/execute.go` | case entry chung; `executeSelectBranches`; `resumeFromComponent` tổng quát; `autoDeferInteraction` type 6; `checkComponentAccess` | P0/P1/P2 |
| `pkg/flow/context.go`, `state.go` | field `Component` trong context; `InvokerUserID` trong state | P1/P2 |
| `pkg/flow/validate.go` | `compileForEntry` case mới; validate `message_data.components` | P1 |
| `pkg/eval/ctx.go` | `SelectEnv`, `interaction.component`, `option` | P1/P2 |
| `pkg/thing/thing.go` | `Contains` hiểu mảng | P1 |
| `internal/core/engine/app.go` | `handleComponentInteraction`, `resolveResumeTarget`, `respondUnavailable`, dedupe | P0 |
| `internal/core/engine/message.go` | nhận `ComponentInteraction`, chọn compiler, trả component config | P0/P1 |
| `internal/core/engine/helpers.go` | `entityLinks` thêm ngữ cảnh component; truyền component vào context | P1 |
| `internal/core/engine/providers.go` | `LinkMessageTemplateInstance` lưu snapshot `message_data` | P1 |
| `internal/api/handler/message/instances.go` | lưu `message_data` khi create/update; trả 400 nếu component không hợp lệ | P1 |
| `internal/api/wire/message.go` | `Validate()` gọi `message.Validate` | P1 |
| `internal/model/message.go`, `internal/store/message.go`, `db/postgres/store_message.go`, `queries/messages.sql`, `pgmodel/*` (sqlc) | cột `message_data` | P1 |
| `db/postgres/migrations/037_add_message_instance_data.{up,down}.sql` | migration | P1 |
| `arikawa/discord/interaction.go` | `Resolved` cho các entity select interaction | P2 |

### Frontend (`kite-web`)
| File | Thay đổi | Phase |
|---|---|---|
| `lib/message/schema.ts`, `schemaRestore.ts` | union string/entity, row rule, luật §14 | P1/P2 |
| `lib/message/messageStore.ts` | action mới; guard `isSelect`; duplicate copy flow (G11) | P1 |
| `lib/message/flowStore.ts` | `cloneFlow(oldId, newId)`, `pruneHandles(id, validHandleIds)` | P1 |
| `lib/types/message.gen.ts`, `flow.gen.ts` | hand-add type | P1 |
| `components/message/MessageComponentSelectMenu.tsx` (**mới**) | SelectMenuEditor | P1 |
| `components/message/MessageSelectOption.tsx` (**mới**) | Option editor | P1 |
| `components/message/MessageComponentRow.tsx`, `MessageComponentsSection.tsx`, `MessageV2Editor.tsx` | thêm select row, bỏ "not supported" | P1 |
| `components/message/MessagePreview.tsx`, `MessageV2Preview.tsx` (+ `MessagePreviewSelectMenu.tsx` nếu cần) | preview | P1 |
| `components/flow/FlowNodeEntryComponentSelect.tsx` (**mới**) | entry node có handle theo option | P1 |
| `components/flow/FlowNodeActionMessage.tsx` | handle cho select và option (đường B) | P1 |
| `components/flow/FlowDialog.tsx` | prop `componentOptions` | P1 |
| `components/flow/FlowPlaceholderExplorer.tsx` | nhóm biến "Menu chọn" và `option.*` | P1 |
| `lib/flow/nodes.ts`, `components.ts`, `dataSchema.ts`, `context.tsx`, `categories.ts`, `templates.ts` | node, context, flow mẫu | P1 |

### AI service và docs
| File | Thay đổi |
|---|---|
| `kite-web/scripts/gen-flow-catalog.ts`, `gen-flow-docs.ts` → `kite-ai-service/src/generated/*.json` | regenerate catalog để AI agent biết node và biến mới |
| `kite-ai-service/src/prompt.ts` | ghi chú ngắn về select, handle theo option và `select.*` |
| `kite-docs/docs/reference/blocks/entries/entry_component_select.md` (**mới**) và một guide "Tạo menu chọn" | docs |

---

## 19. Implementation phases

### P0: Chuẩn hóa dispatcher (không có UI; Button hưởng lợi ngay) — đã commit trong `31523c1`

> Code chính: `internal/core/engine/component.go`, `interaction_dedupe.go`, `app.go`, `message.go`, `helpers.go`, `providers.go`; `pkg/flow/execute.go` (`autoDeferInteraction`, `deferredResponse`, `resumeFromComponent`, `AcknowledgeComponentInteraction`); `pkg/provider/discord.go` (thêm tham số `responseType` cho `AutoDeferInteraction`). Test: `engine/component_test.go`, `engine/interaction_dedupe_test.go`, `pkg/flow/component_test.go`.
> Hạn chế schedule của P0 đã được xử lý trong working tree: migration `037_select_menus` thêm `schedule_id`, dispatcher resolve schedule. Sau khi flow component chạy xong mà chưa phản hồi, engine tự ack bằng type 6. Nghiệm thu Discord thật vẫn còn mở.
1. `handleComponentInteraction` nhận `discord.ComponentInteraction`; tách `resolveResumeTarget` dùng chung với modal, **hỗ trợ EventListenerID và MessageInstanceID** (G4).
2. `respondUnavailable` cho mọi nhánh not-found (G5).
3. `resumeFromComponent` và `MessageInstance.HandleEvent` dùng interface thay vì kiểu Button (G3).
4. `autoDeferInteraction` chọn type 6 cho component (G6).
5. Dedupe interaction ID.
6. Test: button inline từ event listener chạy được; tin nhắn đã xóa khỏi dashboard trả "không còn khả dụng".

**Exit:** toàn bộ test hiện tại pass; button cũ (cả hai đường) chạy như trước.

### P1: String Select end-to-end
1. Data model (§4.1), validation Go (§14), converter (`toStringSelect`) cùng test.
2. Migration và snapshot `message_data`.
3. `entry_component_select`, compile, execute (`executeSelectBranches` + biến `option`), đường B trong `resumeFromComponent`.
4. `SelectEnv` (string), `interaction.component`, `Thing.Contains` cho mảng.
5. Frontend: schema, store, SelectMenuEditor, Option editor, preview, entry node có handle, handle trên `FlowNodeActionMessage`, placeholder explorer, prune handle, sửa duplicate copy flow.
6. Regenerate catalog AI, viết docs.

**Exit:** tạo menu 3 option trong dashboard, gửi, chọn từng option → mỗi option trả reply riêng; multi-select (max 2) chạy đúng 2 nhánh; sửa label hay value rồi "Cập nhật tin nhắn" vẫn giữ binding.

### P2: Entity Select và Access control
1. Converter cho 5/6/7/8, `channel_types`, `default_values` (có template).
2. arikawa `Resolved` → `select.users/roles/channels/mentionables`.
3. UI: chọn loại, loại kênh, giá trị mặc định; preview entity.
4. `access` trên component (dùng cho cả Button), lưu `InvokerUserID` trong `FlowState`.
5. Cho phép `option_command_bot_permissions` trong context component.

### P3: Nâng cao (tùy nhu cầu)
- `reset_on_select`; `control_loop` chế độ for-each; handle "khi không chọn"; option động (template hoặc list) có lưu vào resume state; DnD bằng `@dnd-kit` + `canPlace`; setting log tương tác; TTL và cleanup cho resume point `message_components`; usage type riêng.

---

## 20. Testing checklist

### Unit (Go)
- [ ] `convert`: string select ra đúng `StringSelectComponent` (options, value, default, emoji, min/max, kể cả `min=0`); 4 loại entity; row chứa select; select trong container V2; `ComponentIDFactory` được gọi cho select.
- [ ] `validate`: từng luật ở §14, cả trường hợp đạt và trường hợp lỗi.
- [ ] `copy`: deep copy các field mới (con trỏ và slice không bị chia sẻ).
- [ ] `eachString`: template label, description, placeholder, default_values; **không** template value.
- [ ] `executeSelectBranches`: single; multi (thứ tự theo cấu hình); nhánh chung chạy trước; lỗi ở nhánh chung dừng các nhánh option; value lạ bị bỏ qua; biến `option` được khôi phục sau nhánh.
- [ ] `resumeFromComponent`: button (không đổi hành vi), select, handle option `component_<c>_option_<o>`.
- [ ] `autoDeferInteraction`: component có hoặc không có response node, với edit `@original` → type 6; response create → type 5 (+ ephemeral); command giữ nguyên.
- [ ] `SelectEnv`: values, value, count, options, labels; entity resolved và fallback theo ID.
- [ ] `Thing.Contains`: mảng khớp theo phần tử, chuỗi giữ hành vi cũ.
- [ ] `resolveResumeTarget`: Command, EventListener, MessageInstance, và các trường hợp không tìm thấy.
- [ ] Mở rộng `compile_test`, `validate_test` cho entry mới.

### Frontend
- [ ] Schema: row trộn button + select bị từ chối; entity chứa `options` bị từ chối; value trùng bị báo.
- [ ] Store: thêm select row; đổi loại (xóa options kèm confirm); duplicate select hoặc option (id mới, value có hậu tố, flow được copy); undo/redo.
- [ ] Auto-slug value theo label cho đến khi người dùng sửa tay.
- [ ] Xóa option thì edge của handle tương ứng bị prune.
- [ ] Preview: placeholder, emoji, description, default, disabled; cả legacy và V2.
- [ ] Placeholder explorer hiện `select.*`, `option.*` đúng context.

### Integration (bot thật, server test)
- [ ] Template gửi từ dashboard: chọn → reply; ephemeral; edit tin gốc (`@original` → UpdateMessage); không có response thì ack im lặng, không lỗi.
- [ ] Template gửi qua flow node (`message_template_id`).
- [ ] Inline trong command, trong **event listener** và trong flow của message template (xác nhận G4 đã sửa).
- [ ] Multi-select role picker: thêm role theo từng nhánh; `min=0` bỏ chọn toàn bộ.
- [ ] Flow chậm hơn 3s (dùng `control_sleep`): không có "Interaction failed".
- [ ] Sửa value hoặc label, bấm "Cập nhật tin nhắn đã gửi": binding vẫn đúng. Chưa cập nhật thì tin cũ chạy theo snapshot.
- [ ] Xóa message, flow hoặc command → tin cũ báo ephemeral "không còn khả dụng".
- [ ] Access (P2): roles, permissions, invoker; thông báo từ chối.
- [ ] Bot thiếu Manage Roles → thông báo rõ ràng.
- [ ] Entity select (P2): resolved đúng; `channel_types` lọc đúng; default values có template `{{user.id}}`.
- [ ] Button hiện có (cả hai đường) không bị regression.
- [ ] AI agent (kite-ai-service) tạo được flow có `entry_component_select` hợp lệ theo catalog mới.

---

### Phụ lục: quy ước ID handle (frontend và backend phải khớp)

| Ngữ cảnh | Handle | Ý nghĩa |
|---|---|---|
| Entry `entry_component_select` | *default* (không có id) | Mọi lựa chọn, chạy trước |
| Entry `entry_component_select` | `option_<optionID>` | Nhánh của option |
| Message node (inline) | `component_<compID>` | Button được bấm / select được chọn (mọi lựa chọn) |
| Message node (inline) | `component_<compID>_option_<optionID>` | Nhánh option của select inline |
