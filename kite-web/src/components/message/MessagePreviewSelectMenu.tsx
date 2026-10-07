import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SELECT_TYPE_CHANNEL,
  SELECT_TYPE_MENTIONABLE,
  SELECT_TYPE_ROLE,
  SELECT_TYPE_STRING,
  SELECT_TYPE_USER,
} from "@/lib/message/schema";
import { OptionEmoji } from "./MessageSelectOptions";

// Example entries shown for selects whose choices Discord provides.
const entityExamples: Record<number, { icon: string; label: string }[]> = {
  [SELECT_TYPE_USER]: [
    { icon: "👤", label: "Thành viên A" },
    { icon: "👤", label: "Thành viên B" },
  ],
  [SELECT_TYPE_ROLE]: [
    { icon: "🎭", label: "Vai trò A" },
    { icon: "🎭", label: "Vai trò B" },
  ],
  [SELECT_TYPE_MENTIONABLE]: [
    { icon: "👤", label: "Thành viên A" },
    { icon: "🎭", label: "Vai trò A" },
  ],
  [SELECT_TYPE_CHANNEL]: [
    { icon: "#", label: "chung" },
    { icon: "🔊", label: "Phòng thoại" },
  ],
};

// A Discord-like, static preview of a select menu. It can be opened to look at
// the options but doesn't run anything.
export default function MessagePreviewSelectMenu({ select }: { select: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isString = select.type === SELECT_TYPE_STRING;
  const dynamic = isString && !!select.options_source;
  const options: any[] = isString ? select.options ?? [] : [];
  const defaults = options.filter((o) => o.default);

  const shown =
    defaults.length > 0
      ? defaults.map((o) => o.label).join(", ")
      : select.placeholder || "Chọn một mục";

  return (
    <div ref={ref} className="relative w-full max-w-[400px] text-sm">
      <button
        type="button"
        disabled={select.disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded bg-[#1e1f22] border border-[#1e1f22] px-3 h-10 text-left",
          select.disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#111214]",
          open && "rounded-b-none border-[#111214]"
        )}
      >
        <span
          className={cn(
            "truncate",
            defaults.length > 0 ? "text-[#dbdee1]" : "text-[#949ba4]"
          )}
        >
          {shown}
        </span>
        <ChevronDownIcon
          className={cn("h-5 w-5 text-[#dbdee1] flex-none", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-20 w-full bg-[#2b2d31] border border-[#111214] border-t-0 rounded-b max-h-64 overflow-y-auto">
          {isString && !dynamic &&
            options.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 hover:bg-[#35373c]",
                  o.default && "bg-[#35373c]"
                )}
              >
                <OptionEmoji emoji={o.emoji} />
                <div className="min-w-0">
                  <div className="text-[#dbdee1] truncate">{o.label || "…"}</div>
                  {o.description && (
                    <div className="text-xs text-[#949ba4] truncate">
                      {o.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          {dynamic && (
            <div className="px-3 py-2 text-[#949ba4]">
              Các lựa chọn được tạo từ danh sách khi tin nhắn được gửi.
            </div>
          )}
          {!isString && (
            <>
              {(entityExamples[select.type] ?? []).map((e) => (
                <div key={e.label} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-4 text-center">{e.icon}</span>
                  <span className="text-[#dbdee1]">{e.label}</span>
                </div>
              ))}
              <div className="px-3 py-1.5 text-xs text-[#949ba4]">
                Danh sách do Discord cung cấp.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
