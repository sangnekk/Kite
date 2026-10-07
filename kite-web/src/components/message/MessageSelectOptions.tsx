import { useCallback, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { getUniqueId } from "@/lib/utils";
import {
  Emoji,
  MessageComponentSelectMenuOption as SelectOption,
  SELECT_MAX_OPTIONS,
  SELECT_MAX_OPTION_TEXT,
} from "@/lib/message/schema";
import { newSelectOption, slugifyValue, uniqueValue } from "@/lib/message/select";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import MessageInput from "./MessageInput";
import MessageEmojiPicker from "./MessageEmojiPicker";
import MessageCollapsibleSection from "./MessageCollapsibleSection";
import Twemoji from "../common/Twemoji";

// MessageSelectOptions edits the static options of a String Select. Branches
// of the select's flow are bound to the option id, so renaming, changing the
// value or reordering never loses them.
export default function MessageSelectOptions({
  options,
  onChange,
  validationPath,
  branchCounts,
}: {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
  validationPath: string;
  // Number of actions connected to each option's branch (by option id).
  branchCounts?: Record<number, number>;
}) {
  // Options whose value was typed by the user. Other values follow the label.
  const [touchedValues, setTouchedValues] = useState<Set<number>>(
    () =>
      new Set(
        options.filter((o) => o.value !== slugifyValue(o.label)).map((o) => o.id)
      )
  );

  const update = useCallback(
    (i: number, patch: Partial<SelectOption>) => {
      onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));
    },
    [options, onChange]
  );

  const setLabel = (i: number, label: string) => {
    const option = options[i];
    const patch: Partial<SelectOption> = { label };
    if (!touchedValues.has(option.id)) {
      const others = options.filter((_, j) => j !== i).map((o) => o.value);
      patch.value = uniqueValue(slugifyValue(label), others);
    }
    update(i, patch);
  };

  const setValue = (i: number, value: string) => {
    setTouchedValues((s) => new Set(s).add(options[i].id));
    update(i, { value });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const duplicate = (i: number) => {
    if (options.length >= SELECT_MAX_OPTIONS) return;
    const source = options[i];
    const copy: SelectOption = {
      ...source,
      id: getUniqueId(),
      default: undefined,
      value: uniqueValue(
        source.value,
        options.map((o) => o.value)
      ),
    };
    setTouchedValues((s) => new Set(s).add(copy.id));
    onChange([...options.slice(0, i + 1), copy, ...options.slice(i + 1)]);
  };

  const remove = (i: number) => {
    onChange(options.filter((_, j) => j !== i));
  };

  const add = () => {
    onChange([...options, newSelectOption(options.map((o) => o.value))]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">
          Lựa chọn{" "}
          <span className="text-muted-foreground text-sm">
            ({options.length}/{SELECT_MAX_OPTIONS})
          </span>
        </div>
      </div>

      {options.map((option, i) => (
        <Card key={option.id} className="p-3">
          <MessageCollapsibleSection
            title={option.label || `Lựa chọn ${i + 1}`}
            size="md"
            defaultOpen={false}
            animate={false}
            valiationPathPrefix={`${validationPath}.${i}`}
            className="space-y-3"
            actions={
              <>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded max-w-28 truncate">
                  {option.value || "?"}
                </code>
                {option.default && (
                  <span className="text-xs text-muted-foreground">✓ mặc định</span>
                )}
                {i > 0 && (
                  <ChevronUpIcon
                    className="h-5 w-5"
                    role="button"
                    aria-label="Di chuyển lên"
                    onClick={() => move(i, -1)}
                  />
                )}
                {i < options.length - 1 && (
                  <ChevronDownIcon
                    className="h-5 w-5"
                    role="button"
                    aria-label="Di chuyển xuống"
                    onClick={() => move(i, 1)}
                  />
                )}
                {options.length < SELECT_MAX_OPTIONS && (
                  <CopyIcon
                    className="h-4 w-4"
                    role="button"
                    aria-label="Nhân bản"
                    onClick={() => duplicate(i)}
                  />
                )}
                <TrashIcon
                  className="h-4 w-4"
                  role="button"
                  aria-label="Xóa"
                  onClick={() => remove(i)}
                />
              </>
            }
          >
            <div className="flex gap-3">
              <MessageEmojiPicker
                emoji={option.emoji}
                onChange={(emoji: Emoji | undefined) => update(i, { emoji })}
              />
              <MessageInput
                type="text"
                label="Nhãn (người dùng thấy)"
                maxLength={SELECT_MAX_OPTION_TEXT}
                value={option.label}
                onChange={(v) => setLabel(i, v)}
                validationPath={`${validationPath}.${i}.label`}
                placeholders
              />
            </div>
            <MessageInput
              type="text"
              label="Giá trị (bot nhận, không hiển thị)"
              description="Dùng trong luồng qua {{select.value}}. Phải khác nhau giữa các lựa chọn."
              maxLength={SELECT_MAX_OPTION_TEXT}
              value={option.value}
              onChange={(v) => setValue(i, v)}
              validationPath={`${validationPath}.${i}.value`}
            />
            <MessageInput
              type="text"
              label="Mô tả"
              maxLength={SELECT_MAX_OPTION_TEXT}
              value={option.description ?? ""}
              onChange={(v) => update(i, { description: v || undefined })}
              validationPath={`${validationPath}.${i}.description`}
              placeholders
            />
            <MessageInput
              type="toggle"
              label="Chọn sẵn mặc định"
              value={!!option.default}
              onChange={(v) => update(i, { default: v || undefined })}
            />
            {branchCounts && (
              <div className="text-sm text-muted-foreground">
                {branchCounts[option.id]
                  ? `Nhánh của lựa chọn này có ${branchCounts[option.id]} hành động.`
                  : "Chưa có hành động riêng cho lựa chọn này (vẫn chạy nhánh 'Mọi lựa chọn')."}
              </div>
            )}
          </MessageCollapsibleSection>
        </Card>
      ))}

      <Button
        size="sm"
        variant="outline"
        onClick={add}
        disabled={options.length >= SELECT_MAX_OPTIONS}
      >
        <PlusIcon className="h-4 w-4 mr-1" /> Thêm lựa chọn
      </Button>
    </div>
  );
}

// OptionEmoji renders an option's emoji (unicode or custom) inline.
export function OptionEmoji({ emoji }: { emoji?: Emoji }) {
  if (!emoji) return null;
  if (emoji.id) {
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}`}
        alt=""
        className="h-4 w-4"
      />
    );
  }
  return <Twemoji options={{ className: "h-4 w-4" }}>{emoji.name}</Twemoji>;
}
