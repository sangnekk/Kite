import {
  forwardRef,
  KeyboardEvent,
  RefObject,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";

// See https://akashhamirwasia.com/blog/building-highlighted-input-field-in-react/

const REGEX = /({{[a-z0-9_'().]+}})/g;

export interface PlaceholderSuggestion {
  label: string;
  value: string;
  group?: string;
}

// usePlaceholderAutocomplete drives an inline "{{" autocomplete for any text
// element (input or textarea). It detects an unclosed "{{" before the caret,
// filters the suggestions by what's typed after it, and inserts the chosen
// placeholder wrapped in brackets at the right spot.
function usePlaceholderAutocomplete(
  value: string,
  onChange: (value: string) => void,
  suggestions: PlaceholderSuggestion[] | undefined,
  elementRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  const [query, setQuery] = useState<string | null>(null);
  const [openStart, setOpenStart] = useState(0);
  const [active, setActive] = useState(0);

  const updateQuery = useCallback(
    (text: string, caret: number) => {
      if (!suggestions || suggestions.length === 0) {
        setQuery(null);
        return;
      }

      const before = text.slice(0, caret);
      const open = before.lastIndexOf("{{");
      if (open === -1) {
        setQuery(null);
        return;
      }

      const between = before.slice(open + 2);
      if (between.includes("}}") || between.includes("{{")) {
        setQuery(null);
        return;
      }

      setOpenStart(open);
      setQuery(between);
      setActive(0);
    },
    [suggestions]
  );

  const filtered = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase().trim();
    return (suggestions ?? [])
      .filter(
        (s) =>
          s.value.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, suggestions]);

  const isOpen = query !== null && filtered.length > 0;

  const insert = useCallback(
    (suggestion: PlaceholderSuggestion) => {
      const el = elementRef.current;
      if (!el) return;

      const caret = el.selectionStart ?? value.length;
      const inserted = `{{${suggestion.value}}}`;
      const newValue = value.slice(0, openStart) + inserted + value.slice(caret);

      onChange(newValue);
      setQuery(null);

      const newCaret = openStart + inserted.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
      });
    },
    [value, openStart, onChange, elementRef]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insert(filtered[active]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setQuery(null);
      }
    },
    [isOpen, filtered, active, insert]
  );

  const onCaret = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement) => {
      updateQuery(el.value, el.selectionStart ?? 0);
    },
    [updateQuery]
  );

  const close = useCallback(() => setQuery(null), []);

  return { isOpen, filtered, active, setActive, insert, onKeyDown, onCaret, close };
}

function PlaceholderDropdown({
  items,
  active,
  onPick,
  onHover,
}: {
  items: PlaceholderSuggestion[];
  active: number;
  onPick: (s: PlaceholderSuggestion) => void;
  onHover: (i: number) => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 w-full z-30 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-auto py-1">
      {items.map((s, i) => (
        <button
          type="button"
          key={s.value}
          className={cn(
            "w-full text-left px-3 py-1.5 flex flex-col gap-0.5",
            i === active ? "bg-accent" : "hover:bg-accent/50"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
          onMouseEnter={() => onHover(i)}
        >
          <span className="text-sm leading-none">{s.label}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {"{{"}
            {s.value}
            {"}}"}
          </span>
        </button>
      ))}
    </div>
  );
}

const PlaceholderInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    suggestions?: PlaceholderSuggestion[];
  }
>(({ value, onChange, placeholder, suggestions }, ref) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

  const ac = usePlaceholderAutocomplete(value, onChange, suggestions, innerRef);

  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const syncScroll = useCallback((e: any) => {
    if (renderRef.current) {
      renderRef.current.scrollTop = e.target.scrollTop;
      renderRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  const parts = useMemo(() => {
    return value.split(REGEX).map((word, i) => {
      if (word.match(REGEX) !== null) {
        return (
          <span
            key={i}
            className="bg-blue-500 rounded-[3px] bg-opacity-30 pr-[8px] py-[2px] -ml-[3px]"
          >
            {word}
          </span>
        );
      } else {
        return <span key={i}>{word}</span>;
      }
    });
  }, [value]);

  // Restore the caret after `value` actually changes in the DOM. The value
  // flows back through an external store (React Flow / Zustand) and may land in
  // a later commit than the keystroke. Keying this to [value] makes the restore
  // run on the commit where the new value is applied — instead of on every
  // render, which would consume selectionRef on a stale-value commit and let
  // the caret jump to the end on the next one.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (el && selectionRef.current && document.activeElement === el) {
      el.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
      selectionRef.current = null;
    }
  }, [value]);

  return (
    <div className="relative h-10 w-full">
      <Input
        onScroll={syncScroll}
        value={value}
        onChange={(e) => {
          selectionRef.current = {
            start: e.target.selectionStart ?? 0,
            end: e.target.selectionEnd ?? 0,
          };
          onChange(e.target.value);
          ac.onCaret(e.target);
        }}
        onKeyUp={(e) => ac.onCaret(e.currentTarget)}
        onClick={(e) => ac.onCaret(e.currentTarget)}
        onKeyDown={ac.onKeyDown}
        onBlur={() => window.setTimeout(ac.close, 150)}
        className="bg-transparent absolute inset-0 z-10"
        ref={innerRef}
        placeholder={placeholder}
      />
      <div
        ref={renderRef}
        className="absolute inset-0 whitespace-pre overflow-x-auto select-none scroll px-3 py-2 text-sm flex items-center text-transparent"
        style={{
          scrollbarWidth: "none",
        }}
      >
        {parts}
      </div>
      {ac.isOpen && (
        <PlaceholderDropdown
          items={ac.filtered}
          active={ac.active}
          onPick={ac.insert}
          onHover={ac.setActive}
        />
      )}
    </div>
  );
});

PlaceholderInput.displayName = "PlaceholderInput";
export default PlaceholderInput;

// PlaceholderTextarea is the multi-line counterpart. It skips the highlight
// overlay (hard to keep in sync across wrapped lines) but keeps the inline
// "{{" autocomplete dropdown.
export const PlaceholderTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    suggestions?: PlaceholderSuggestion[];
    minRows?: number;
    maxRows?: number;
  }
>(({ value, onChange, placeholder, suggestions, minRows, maxRows }, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

  const ac = usePlaceholderAutocomplete(value, onChange, suggestions, innerRef);

  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  // Restore the caret after `value` actually changes in the DOM. The value
  // flows back through an external store (React Flow / Zustand) and may land in
  // a later commit than the keystroke. Keying this to [value] makes the restore
  // run on the commit where the new value is applied — instead of on every
  // render, which would consume selectionRef on a stale-value commit and let
  // the caret jump to the end on the next one.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (el && selectionRef.current && document.activeElement === el) {
      el.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
      selectionRef.current = null;
    }
  }, [value]);

  return (
    <div className="relative w-full">
      <Textarea
        value={value}
        onChange={(e) => {
          selectionRef.current = {
            start: e.target.selectionStart ?? 0,
            end: e.target.selectionEnd ?? 0,
          };
          onChange(e.target.value);
          ac.onCaret(e.target);
        }}
        onKeyUp={(e) => ac.onCaret(e.currentTarget)}
        onClick={(e) => ac.onCaret(e.currentTarget)}
        onKeyDown={ac.onKeyDown}
        onBlur={() => window.setTimeout(ac.close, 150)}
        ref={innerRef}
        placeholder={placeholder}
        minRows={minRows}
        maxRows={maxRows}
      />
      {ac.isOpen && (
        <PlaceholderDropdown
          items={ac.filtered}
          active={ac.active}
          onPick={ac.insert}
          onHover={ac.setActive}
        />
      )}
    </div>
  );
});

PlaceholderTextarea.displayName = "PlaceholderTextarea";
