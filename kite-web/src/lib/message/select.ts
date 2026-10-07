import { getUniqueId } from "@/lib/utils";
import { FlowData } from "@/lib/flow/dataSchema";
import { FlowComponentOption } from "@/lib/flow/context";
import {
  SELECT_MAX_OPTION_TEXT,
  SELECT_TYPE_CHANNEL,
  SELECT_TYPE_MENTIONABLE,
  SELECT_TYPE_ROLE,
  SELECT_TYPE_STRING,
  SELECT_TYPE_USER,
} from "./schema";

export const selectTypeOptions = [
  {
    value: SELECT_TYPE_STRING,
    label: "Danh sách tùy chỉnh",
    description: "Bạn tự tạo các lựa chọn (ví dụ: sản phẩm, chủ đề hỗ trợ).",
  },
  {
    value: SELECT_TYPE_USER,
    label: "Người dùng",
    description: "Discord hiển thị danh sách thành viên của server.",
  },
  {
    value: SELECT_TYPE_ROLE,
    label: "Vai trò",
    description: "Discord hiển thị danh sách vai trò của server.",
  },
  {
    value: SELECT_TYPE_MENTIONABLE,
    label: "Người dùng & vai trò",
    description: "Discord hiển thị cả thành viên và vai trò.",
  },
  {
    value: SELECT_TYPE_CHANNEL,
    label: "Kênh",
    description: "Discord hiển thị danh sách kênh, có thể lọc theo loại kênh.",
  },
];

export function selectTypeLabel(type: number) {
  return selectTypeOptions.find((o) => o.value === type)?.label ?? "Menu chọn";
}

// slugifyValue turns a label into a value the bot receives, e.g.
// "Mua VPS giá rẻ" -> "mua_vps_gia_re".
export function slugifyValue(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, SELECT_MAX_OPTION_TEXT);
}

// uniqueValue returns base, or base with a numeric suffix if it's taken.
export function uniqueValue(base: string, taken: string[]): string {
  const value = base || "lua_chon";
  if (!taken.includes(value)) return value;
  for (let i = 2; ; i++) {
    const suffix = `_${i}`;
    const candidate =
      value.slice(0, SELECT_MAX_OPTION_TEXT - suffix.length) + suffix;
    if (!taken.includes(candidate)) return candidate;
  }
}

export function newSelectOption(taken: string[] = []) {
  const n = taken.length + 1;
  return {
    id: getUniqueId(),
    label: `Lựa chọn ${n}`,
    value: uniqueValue(`lua_chon_${n}`, taken),
  };
}

export function newSelectMenu(type: number = SELECT_TYPE_STRING): any {
  const base = {
    id: getUniqueId(),
    type,
    placeholder: "",
    flow_source_id: getUniqueId().toString(),
  };

  if (type === SELECT_TYPE_STRING) {
    return { ...base, options: [newSelectOption()] };
  }
  return base;
}

// newSelectRow returns an action row holding a single select menu: Discord
// doesn't allow a select to share its row.
export function newSelectRow(type: number = SELECT_TYPE_STRING): any {
  return { id: getUniqueId(), type: 1, components: [newSelectMenu(type)] };
}

export function initialSelectFlow(): FlowData {
  return {
    nodes: [
      {
        id: getUniqueId().toString(),
        position: { x: 0, y: 0 },
        data: {},
        type: "entry_component_select",
      },
    ],
    edges: [],
  };
}

export function selectFlowOptions(select: any): FlowComponentOption[] {
  if (select?.type !== SELECT_TYPE_STRING || select.options_source) return [];
  return (select.options ?? []).map((o: any) => ({
    id: o.id,
    label: o.label,
    value: o.value,
    emoji: o.emoji?.id ? undefined : o.emoji?.name,
  }));
}

// describeValueLimits explains the min/max settings in plain words.
export function describeValueLimits(min: number, max: number): string {
  if (min === 0 && max === 1) return "Người dùng có thể chọn 1 mục hoặc bỏ trống.";
  if (min === max) return `Người dùng phải chọn đúng ${min} mục.`;
  if (min === 0) return `Người dùng có thể chọn tối đa ${max} mục hoặc bỏ trống.`;
  return `Người dùng phải chọn từ ${min} đến ${max} mục.`;
}
