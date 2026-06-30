import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Handle = "top" | "bottom" | "left" | "right";

interface Props {
  /** Category accent color (hex) — drives the icon chip, glow and handles. */
  color: string;
  icon: ReactNode;
  title: string;
  description?: string;
  /** Small mono category label shown in the top-right, e.g. "ENTRY". */
  tag?: string;
  /** Connection dots to render on the given edges. */
  handles?: Handle[];
  /** Soft colored glow around the whole block. */
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const handlePos: Record<Handle, string> = {
  top: "left-1/2 -top-1.5 -translate-x-1/2",
  bottom: "left-1/2 -bottom-1.5 -translate-x-1/2",
  left: "-left-1.5 top-1/2 -translate-y-1/2",
  right: "-right-1.5 top-1/2 -translate-y-1/2",
};

/**
 * A single flow "node" rendered in the editor's visual language: a colored
 * icon chip, a title and an optional description, with connection handles.
 * This is the atom the whole landing page is built from.
 */
export default function FlowBlock({
  color,
  icon,
  title,
  description,
  tag,
  handles = [],
  glow = false,
  className,
  style,
}: Props) {
  return (
    <div
      className={cn(
        "home-block group relative rounded-xl px-3 py-2.5 shadow-lg transition-all duration-300",
        className
      )}
      style={{
        boxShadow: glow
          ? `0 10px 40px -12px ${color}80, 0 0 0 1px ${color}26`
          : undefined,
        ...style,
      }}
    >
      {tag && (
        <span
          className="absolute -top-2.5 right-3 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em]"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          {tag}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: color,
            boxShadow: `0 6px 18px -4px ${color}b3`,
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-5 text-stone-100">
            {title}
          </div>
          {description && (
            <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-stone-400">
              {description}
            </div>
          )}
        </div>
      </div>

      {handles.map((h) => (
        <span
          key={h}
          aria-hidden
          className={cn(
            "absolute h-3 w-3 rounded-full border-2 border-[#0a0908]",
            handlePos[h]
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
