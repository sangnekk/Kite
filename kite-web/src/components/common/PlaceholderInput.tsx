import {
  forwardRef,
  KeyboardEvent,
  ReactNode,
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
import {
  applyCompletion,
  Completion,
  CompletionContext,
  CompletionItem,
  completeAt,
  diagnose,
  Diagnostic,
} from "@/lib/flow/expressionEngine";
import { CircleAlertIcon } from "lucide-react";

// See https://akashhamirwasia.com/blog/building-highlighted-input-field-in-react/

const REGEX = /({{[a-z0-9_'().]+}})/g;

export interface PlaceholderSuggestion {
  label: string;
  value: string;
  group?: string;
}

// usePlaceholderAutocomplete drives an inline "{{" autocomplete for any text
// element (input or textarea). It asks the completion engine what can be typed
// at the caret (the members after a dot, the values and functions at the start
// of an operand) and puts the chosen item in the text, closing the braces.
function usePlaceholderAutocomplete(
  value: string,
  onChange: (value: string) => void,
  suggestions: PlaceholderSuggestion[] | undefined,
  elementRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  completionContext?: CompletionContext,
) {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [active, setActive] = useState(0);

  const updateQuery = useCallback(
    (text: string, caret: number) => {
      const next = completeAt(
        text,
        caret,
        suggestions ?? [],
        completionContext,
      );
      setCompletion(next);
      setActive(0);
    },
    [suggestions, completionContext],
  );

  const filtered = useMemo(() => completion?.items ?? [], [completion]);
  const isOpen = filtered.length > 0;

  const insert = useCallback(
    (item: CompletionItem) => {
      const el = elementRef.current;
      if (!el || !completion) return;

      const out = applyCompletion(value, completion, item);

      onChange(out.text);
      setCompletion(null);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(out.caret, out.caret);
      });
    },
    [value, completion, onChange, elementRef],
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
        setCompletion(null);
      }
    },
    [isOpen, filtered, active, insert],
  );

  const onCaret = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement) => {
      updateQuery(el.value, el.selectionStart ?? 0);
    },
    [updateQuery],
  );

  const close = useCallback(() => setCompletion(null), []);

  return {
    isOpen,
    filtered,
    active,
    setActive,
    insert,
    onKeyDown,
    onCaret,
    close,
  };
}

function PlaceholderDropdown({
  items,
  active,
  onPick,
  onHover,
}: {
  items: CompletionItem[];
  active: number;
  onPick: (s: CompletionItem) => void;
  onHover: (i: number) => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 w-full z-30 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-auto py-1">
      {items.map((s, i) => (
        <button
          type="button"
          key={`${s.kind}:${s.insert}:${i}`}
          className={cn(
            "w-full text-left px-3 py-1.5 flex flex-col gap-0.5",
            i === active ? "bg-accent" : "hover:bg-accent/50",
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
          onMouseEnter={() => onHover(i)}
        >
          <span
            className={cn(
              "text-sm leading-none",
              s.kind !== "value" && "font-mono",
            )}
          >
            {s.label}
            {s.kind === "function" && "()"}
          </span>
          {s.detail && (
            <span className="text-xs text-muted-foreground font-mono break-words">
              {s.detail}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// What is wrong in the expressions of a field, under it, in red.
function DiagnosticMessages({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const messages = Array.from(new Set(diagnostics.map((d) => d.message)));
  if (messages.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1" role="alert">
      {messages.map((message) => (
        <div
          key={message}
          className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400"
        >
          <CircleAlertIcon className="mt-px h-3.5 w-3.5 flex-none" />
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
}

const BLUE_BOX =
  "bg-blue-500 rounded-[3px] bg-opacity-30 pr-[8px] py-[2px] -ml-[3px]";
const RED_BOX =
  "bg-red-500 rounded-[3px] bg-opacity-30 pr-[8px] py-[2px] -ml-[3px] underline decoration-red-500 decoration-wavy underline-offset-4";
const RED_MARK =
  "bg-red-500 bg-opacity-20 underline decoration-red-500 decoration-wavy underline-offset-4";

// The highlight layer under the input: {{placeholders}} in blue, and what is
// wrong in red (the whole placeholder, or just the call in a longer text).
function highlightParts(value: string, diagnostics: Diagnostic[]) {
  const parts: ReactNode[] = [];
  let pos = 0;

  value.split(REGEX).forEach((word, i) => {
    const start = pos;
    const end = start + word.length;
    pos = end;

    const bad = diagnostics.filter((d) => d.from < end && d.to > start);

    if (word.match(REGEX) !== null) {
      parts.push(
        <span key={i} className={bad.length > 0 ? RED_BOX : BLUE_BOX}>
          {word}
        </span>,
      );
      return;
    }

    if (bad.length === 0) {
      parts.push(<span key={i}>{word}</span>);
      return;
    }

    // Plain text with a problem inside: only the part that is wrong is marked.
    let at = start;
    bad
      .slice()
      .sort((a, b) => a.from - b.from)
      .forEach((d, j) => {
        const from = Math.max(d.from, at);
        const to = Math.min(d.to, end);
        if (to <= from) return;

        if (from > at) {
          parts.push(<span key={`${i}-p${j}`}>{value.slice(at, from)}</span>);
        }
        parts.push(
          <span key={`${i}-m${j}`} className={RED_MARK}>
            {value.slice(from, to)}
          </span>,
        );
        at = to;
      });
    if (at < end)
      parts.push(<span key={`${i}-t`}>{value.slice(at, end)}</span>);
  });

  return parts;
}

const PlaceholderInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    suggestions?: PlaceholderSuggestion[];
    /** What the expression language knows here: enables members and functions. */
    completion?: CompletionContext;
  }
>(({ value, onChange, placeholder, suggestions, completion }, ref) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

  const ac = usePlaceholderAutocomplete(
    value,
    onChange,
    suggestions,
    innerRef,
    completion,
  );

  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const syncScroll = useCallback((e: any) => {
    if (renderRef.current) {
      renderRef.current.scrollTop = e.target.scrollTop;
      renderRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  const diagnostics = useMemo(
    () => (completion ? diagnose(value, completion) : []),
    [value, completion],
  );

  const parts = useMemo(
    () => highlightParts(value, diagnostics),
    [value, diagnostics],
  );

  // Restore the caret after `value` actually changes in the DOM. The value
  // flows back through an external store (React Flow / Zustand) and may land in
  // a later commit than the keystroke. Keying this to [value] makes the restore
  // run on the commit where the new value is applied — instead of on every
  // render, which would consume selectionRef on a stale-value commit and let
  // the caret jump to the end on the next one.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (el && selectionRef.current && document.activeElement === el) {
      el.setSelectionRange(
        selectionRef.current.start,
        selectionRef.current.end,
      );
      selectionRef.current = null;
    }
  }, [value]);

  return (
    <div className="w-full">
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
      <DiagnosticMessages diagnostics={diagnostics} />
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
    completion?: CompletionContext;
    minRows?: number;
    maxRows?: number;
  }
>(
  (
    { value, onChange, placeholder, suggestions, completion, minRows, maxRows },
    ref,
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

    const ac = usePlaceholderAutocomplete(
      value,
      onChange,
      suggestions,
      innerRef,
      completion,
    );

    const textareaDiagnostics = useMemo(
      () => (completion ? diagnose(value, completion) : []),
      [value, completion],
    );

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
        el.setSelectionRange(
          selectionRef.current.start,
          selectionRef.current.end,
        );
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
        <DiagnosticMessages diagnostics={textareaDiagnostics} />
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
  },
);

PlaceholderTextarea.displayName = "PlaceholderTextarea";
