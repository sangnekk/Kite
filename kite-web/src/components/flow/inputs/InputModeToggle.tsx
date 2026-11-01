import { InputMode, PickKind } from "@/lib/flow/inputMode";
import { cn } from "@/lib/utils";

/** The hint of an empty field that is typed instead of picked. */
export function idHint(kind: PickKind): string {
  switch (kind) {
    case "channel":
      return "ID kênh, hoặc biến như {{channel.id}}";
    case "role":
      return "ID vai trò, hoặc một biến";
    case "guild":
      return "ID server, hoặc biến như {{guild.id}}";
  }
}

const modes: { value: InputMode; label: string; title: string }[] = [
  { value: "pick", label: "Chọn", title: "Chọn từ danh sách theo tên" },
  {
    value: "expression",
    label: "Dùng biến",
    title: "Nhập ID hoặc biến, ví dụ {{channel.id}}",
  },
];

/**
 * Switches a field between picking from a list and typing an ID or a variable.
 * The value is kept when switching, so nothing is lost by looking at the other
 * side.
 */
export default function InputModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Cách nhập"
      className="inline-flex shrink-0 rounded-md border bg-muted/40 p-0.5 text-xs"
    >
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          title={m.title}
          aria-pressed={mode === m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === m.value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
