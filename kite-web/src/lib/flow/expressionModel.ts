import { z } from "zod";
import type { FunctionInfo, Member } from "./expressionEngine";

// What the expression language of the backend knows, written down once. The
// members come from the structs of kite-service/pkg/eval (the `expr` tags), and
// the functions from the flow and the expr library.

const userMembers: Member[] = [
  { name: "id", detail: "ID của người dùng" },
  { name: "username", detail: "Tên đăng nhập" },
  { name: "discriminator", detail: "Số phân biệt (#1234)" },
  { name: "display_name", detail: "Tên hiển thị" },
  { name: "name", detail: "Tên" },
  { name: "mention", detail: "Chuỗi nhắc đến, <@id>" },
  { name: "avatar_url", detail: "Link ảnh đại diện" },
  { name: "banner_url", detail: "Link ảnh bìa" },
];

const memberMembers: Member[] = [
  ...userMembers,
  { name: "nick", detail: "Biệt danh trong server" },
  { name: "role_ids", detail: "Danh sách ID vai trò" },
];

const snowflakeMembers: Member[] = [{ name: "id", detail: "ID" }];

/** The values that stand alone in every flow. */
export const ROOT_MEMBERS: Member[] = [
  { name: "user", detail: "Người dùng kích hoạt flow", members: memberMembers },
  { name: "member", detail: "Thành viên (trong server)", members: memberMembers },
  { name: "channel", detail: "Kênh của sự kiện", members: snowflakeMembers },
  { name: "guild", detail: "Server của sự kiện", members: snowflakeMembers },
  { name: "server", detail: "Giống guild", members: snowflakeMembers },
  {
    name: "app",
    detail: "Ứng dụng bot này",
    members: [{ name: "user", detail: "Người dùng của bot", members: userMembers }],
  },
  {
    name: "interaction",
    detail: "Tương tác Discord đang chạy",
    members: [
      { name: "id", detail: "ID tương tác" },
      { name: "channel", members: snowflakeMembers },
      { name: "guild", members: snowflakeMembers },
      { name: "user", members: memberMembers },
      { name: "member", members: memberMembers },
    ],
  },
];

/** Functions of the flow itself. */
const flowFunctions: FunctionInfo[] = [
  {
    name: "result",
    detail: "result('id') — kết quả của một khối",
    insert: "result('')",
    caretBack: 2,
  },
  {
    name: "var",
    detail: "var('tên') — biến tạm",
    insert: "var('')",
    caretBack: 2,
  },
  {
    name: "arg",
    detail: "arg('tên') — tham số của lệnh",
    insert: "arg('')",
    caretBack: 2,
  },
  {
    name: "input",
    detail: "input('id') — giá trị một ô của modal",
    insert: "input('')",
    caretBack: 2,
  },
];

// The functions of the expr library the flows use most. The whole list is in
// the expr documentation; these are the ones worth suggesting.
const libraryFunctions: [string, string][] = [
  ["upper", "upper(văn bản) — IN HOA"],
  ["lower", "lower(văn bản) — in thường"],
  ["trim", "trim(văn bản) — cắt khoảng trắng hai đầu"],
  ["split", "split(văn bản, ký tự) — tách thành danh sách"],
  ["join", "join(danh sách, ký tự) — nối thành văn bản"],
  ["replace", "replace(văn bản, tìm, thay) — thay thế"],
  ["hasPrefix", "hasPrefix(văn bản, đầu) — bắt đầu bằng"],
  ["hasSuffix", "hasSuffix(văn bản, cuối) — kết thúc bằng"],
  ["indexOf", "indexOf(văn bản, mẫu) — vị trí đầu tiên, -1 nếu không có"],
  ["repeat", "repeat(văn bản, số lần) — lặp lại"],
  ["len", "len(x) — độ dài của văn bản hoặc danh sách"],
  ["string", "string(x) — chuyển thành văn bản"],
  ["int", "int(x) — chuyển thành số nguyên"],
  ["float", "float(x) — chuyển thành số thực"],
  ["abs", "abs(số) — giá trị tuyệt đối"],
  ["round", "round(số) — làm tròn"],
  ["floor", "floor(số) — làm tròn xuống"],
  ["ceil", "ceil(số) — làm tròn lên"],
  ["min", "min(a, b, ...) — nhỏ nhất"],
  ["max", "max(a, b, ...) — lớn nhất"],
  ["sum", "sum(danh sách) — tổng"],
  ["mean", "mean(danh sách) — trung bình"],
  ["first", "first(danh sách) — phần tử đầu"],
  ["last", "last(danh sách) — phần tử cuối"],
  ["take", "take(danh sách, n) — n phần tử đầu"],
  ["reverse", "reverse(danh sách) — đảo ngược"],
  ["sort", "sort(danh sách) — sắp xếp"],
  ["concat", "concat(a, b, ...) — nối các danh sách"],
  ["filter", "filter(danh sách, # > 1) — lọc, # là phần tử"],
  ["map", "map(danh sách, # * 2) — biến đổi từng phần tử"],
  ["count", "count(danh sách, # > 1) — đếm phần tử thỏa điều kiện"],
  ["any", "any(danh sách, # > 1) — có phần tử nào thỏa"],
  ["all", "all(danh sách, # > 1) — mọi phần tử đều thỏa"],
  ["keys", "keys(đối tượng) — danh sách khóa"],
  ["values", "values(đối tượng) — danh sách giá trị"],
  ["toJSON", "toJSON(x) — chuyển thành JSON"],
  ["fromJSON", "fromJSON(văn bản) — đọc JSON"],
  ["now", "now() — thời điểm hiện tại"],
  ["date", "date('2026-11-01') — đọc một ngày"],
  ["duration", "duration('1h30m') — một khoảng thời gian"],
];

export const FUNCTIONS: FunctionInfo[] = [
  ...flowFunctions,
  ...libraryFunctions.map(([name, detail]) => ({ name, detail })),
];

type Zod = z.ZodTypeAny;

// The wrappers around the schema that hide the object inside.
function unwrap(schema: Zod): Zod {
  let current = schema;
  for (let i = 0; i < 8; i++) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = current._def.innerType;
    } else if (current instanceof z.ZodEffects) {
      current = current._def.schema;
    } else {
      break;
    }
  }
  return current;
}

function typeName(schema: Zod): string {
  const inner = unwrap(schema);
  if (inner instanceof z.ZodString) return "văn bản";
  if (inner instanceof z.ZodNumber) return "số";
  if (inner instanceof z.ZodBoolean) return "đúng/sai";
  if (inner instanceof z.ZodArray) return "danh sách";
  if (inner instanceof z.ZodObject) return "đối tượng";
  if (inner instanceof z.ZodEnum) return inner.options.join(" | ");
  return "";
}

/**
 * The members of the result of a node, read from the zod schema the editor
 * already keeps for it (the same one that feeds the AI catalog and the docs).
 */
export function membersOfSchema(schema: Zod | undefined, depth = 0): Member[] {
  if (!schema || depth > 4) return [];

  const object = unwrap(schema);
  if (!(object instanceof z.ZodObject)) return [];

  return Object.entries(object.shape as Record<string, Zod>).map(
    ([name, field]) => {
      const kind = typeName(field);
      const description = field.description ?? unwrap(field).description;

      return {
        name,
        detail: [kind, description].filter(Boolean).join(" · ") || undefined,
        members: membersOfSchema(field, depth + 1),
      };
    }
  );
}
