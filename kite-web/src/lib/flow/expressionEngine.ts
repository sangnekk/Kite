/**
 * Completion for the `{{ expression }}` of a flow field, without any UI: give it
 * the text and the caret and it says what can be typed there. The expression
 * language is the one of the backend (expr), where a typo is not an error but
 * an empty value, so a list of what exists is worth more than a check later.
 */

/** A name that can follow a dot, or a name that stands alone. */
export interface Member {
  name: string;
  detail?: string;
  /** What follows its dot, when it is an object. */
  members?: Member[];
}

export interface FunctionInfo {
  name: string;
  detail?: string;
  /** What is inserted, `name()` when left out. */
  insert?: string;
  /** How far back from the end of the insert the caret goes (into the parentheses). */
  caretBack?: number;
}

/** A full value the editor already offers, like user.id or result('abc'). */
export interface Suggestion {
  label: string;
  value: string;
  group?: string;
}

export interface CompletionContext {
  /** Values that stand alone and have members: user, channel... */
  roots: Member[];
  functions: FunctionInfo[];
  /** The members of result('id'), when the node with that ID has a known result. */
  resultMembers?: (nodeId: string) => Member[] | undefined;

  // What a call can name, to say when it names nothing. A set that is left out
  // means "not known here", and then nothing is reported about it.
  /** IDs of the nodes before this one whose result can be read. */
  resultIds?: Set<string>;
  /** Names given to the results of the nodes before this one (var('name')). */
  varNames?: Set<string>;
  /** Arguments of the command (arg('name')). */
  argNames?: Set<string>;
  /** IDs of the inputs of the modal (input('id')). */
  inputIds?: Set<string>;
}

/** A problem in an expression, with the part of the text it is about. */
export interface Diagnostic {
  from: number;
  to: number;
  message: string;
}

export interface CompletionItem {
  label: string;
  detail?: string;
  insert: string;
  kind: "field" | "function" | "value";
  /** Leave the caret before the closing braces, because more is typed after it. */
  keepOpen?: boolean;
  /** Move the caret back from the end of the insert, into parentheses. */
  caretBack?: number;
}

export interface Completion {
  /** The text from `from` to `to` is replaced by the item. */
  from: number;
  to: number;
  items: CompletionItem[];
}

export const MAX_ITEMS = 12;

const IDENT_END = /[A-Za-z_][A-Za-z0-9_]*$/;
const CALL = String.raw`(?:\(\s*(?:'[^']*'|"[^"]*")?\s*\))?`;
const CHAIN_END = new RegExp(
  String.raw`((?:[A-Za-z_]\w*${CALL}\.)*[A-Za-z_]\w*${CALL})$`
);
const SEGMENT =
  /([A-Za-z_]\w*)(?:\(\s*(?:'([^']*)'|"([^"]*)")?\s*\))?/g;

interface Segment {
  name: string;
  arg?: string;
  call: boolean;
}

/** The text of the `{{` that is still open before the caret, if any. */
export function openExpression(
  text: string,
  caret: number
): { start: number; expr: string } | null {
  const before = text.slice(0, caret);
  const open = before.lastIndexOf("{{");
  if (open === -1) return null;

  const expr = before.slice(open + 2);
  if (expr.includes("}}") || expr.includes("{{")) return null;

  return { start: open + 2, expr };
}

function parseChain(text: string): Segment[] | null {
  const match = CHAIN_END.exec(text);
  if (!match) return null;

  const segments: Segment[] = [];
  for (const m of match[1].matchAll(SEGMENT)) {
    segments.push({
      name: m[1],
      arg: m[2] ?? m[3],
      call: m[0].includes("("),
    });
  }
  return segments.length > 0 ? segments : null;
}

function membersOf(
  segments: Segment[],
  ctx: CompletionContext
): Member[] | undefined {
  const [first, ...rest] = segments;

  let members: Member[] | undefined;
  if (first.name === "result") {
    members = first.arg !== undefined ? ctx.resultMembers?.(first.arg) : undefined;
  } else if (!first.call) {
    members = ctx.roots.find((r) => r.name === first.name)?.members;
  }

  for (const seg of rest) {
    if (!members) return undefined;
    members = members.find((m) => m.name === seg.name)?.members;
  }
  return members;
}

// Inside a quoted string nothing is completed.
function insideString(expr: string): boolean {
  let quote: string | null = null;
  for (const ch of expr) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    }
  }
  return quote !== null;
}

function rank(name: string, partial: string): number {
  if (!partial) return 1;
  const n = name.toLowerCase();
  const p = partial.toLowerCase();
  if (n === p) return 0;
  if (n.startsWith(p)) return 1;
  return n.includes(p) ? 2 : -1;
}

function pick<T>(
  items: T[],
  partial: string,
  names: (item: T) => string[]
): T[] {
  return items
    .map((item, i) => ({
      item,
      i,
      score: Math.min(
        ...names(item)
          .map((n) => rank(n, partial))
          .filter((s) => s >= 0),
        99
      ),
    }))
    .filter((r) => r.score < 99)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((r) => r.item);
}

function memberItems(members: Member[], partial: string): CompletionItem[] {
  return pick(members, partial, (m) => [m.name])
    .slice(0, MAX_ITEMS)
    .map((m) => ({
      label: m.name,
      detail: m.detail,
      insert: m.name,
      kind: "field" as const,
      keepOpen: !!m.members?.length,
    }));
}

/**
 * What can be typed at the caret. Returns null when the caret is not inside an
 * open `{{`, or when there is nothing to offer.
 *
 * Three cases, in order: after a dot the members of what is before it; at the
 * start of an operand the values, roots and functions that match the word; and
 * as the last resort the whole expression matched against the values the editor
 * offers (how a plain field without a context behaves).
 */
export function completeAt(
  text: string,
  caret: number,
  suggestions: Suggestion[],
  ctx?: CompletionContext
): Completion | null {
  const open = openExpression(text, caret);
  if (!open) return null;

  const { expr, start } = open;
  if (insideString(expr)) return null;

  const word = IDENT_END.exec(expr)?.[0] ?? "";
  const from = caret - word.length;
  const beforeWord = expr.slice(0, expr.length - word.length);

  if (ctx) {
    // 1. after a dot: the members of the thing before it
    if (/\.\s*$/.test(beforeWord)) {
      const receiver = beforeWord.replace(/\.\s*$/, "");
      const segments = parseChain(receiver);
      const members = segments ? membersOf(segments, ctx) : undefined;

      if (members) {
        const items = memberItems(members, word);
        return items.length > 0 ? { from, to: caret, items } : null;
      }
    } else {
      // 2. the start of an operand: values, roots and functions
      const items = topLevelItems(word, beforeWord, suggestions, ctx);
      if (items.length > 0) return { from, to: caret, items };
    }
  }

  // 3. the whole expression against the offered values; with a context the
  // two cases above already cover everything, and a finished expression must not
  // keep offering itself
  if (ctx) return null;

  const q = expr.toLowerCase().trim();
  const legacy = suggestions
    .filter(
      (s) =>
        s.value.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    )
    .slice(0, 8)
    .map((s) => suggestionItem(s));

  return legacy.length > 0 ? { from: start, to: caret, items: legacy } : null;
}

function suggestionItem(s: Suggestion, ctx?: CompletionContext): CompletionItem {
  let keepOpen = false;
  if (ctx) {
    const result = /^result\('([^']*)'\)$/.exec(s.value);
    keepOpen = result
      ? !!ctx.resultMembers?.(result[1])?.length
      : !!ctx.roots.find((r) => r.name === s.value)?.members?.length;
  }

  return {
    label: s.label,
    detail: `{{${s.value}}}`,
    insert: s.value,
    kind: "value",
    keepOpen,
  };
}

// True at the start of an expression and after an opening parenthesis, a comma
// or an operator, where a value is expected.
function operandCanStart(beforeWord: string): boolean {
  const t = beforeWord.trimEnd();
  return t === "" || /[(,\-+*/%<>=!&|?:]$/.test(t);
}

function topLevelItems(
  word: string,
  beforeWord: string,
  suggestions: Suggestion[],
  ctx: CompletionContext
): CompletionItem[] {
  // Nothing typed yet: only the values of the editor, not every function, and
  // only where an operand can start (not after a finished one).
  if (word === "") {
    if (!operandCanStart(beforeWord)) return [];
    return suggestions.slice(0, MAX_ITEMS).map((s) => suggestionItem(s, ctx));
  }

  const values = pick(suggestions, word, (s) => [s.value, s.label]).map((s) =>
    suggestionItem(s, ctx)
  );
  const taken = new Set(values.map((v) => v.insert));

  const roots = pick(
    ctx.roots.filter((r) => !taken.has(r.name)),
    word,
    (r) => [r.name]
  ).map<CompletionItem>((r) => ({
    label: r.name,
    detail: r.detail,
    insert: r.name,
    kind: "field",
    keepOpen: !!r.members?.length,
  }));

  const functions = pick(ctx.functions, word, (f) => [f.name]).map<CompletionItem>(
    (f) => ({
      label: f.name,
      detail: f.detail,
      insert: f.insert ?? `${f.name}()`,
      kind: "function",
      caretBack: f.caretBack ?? (f.insert ? 0 : 1),
    })
  );

  return [...values, ...roots, ...functions].slice(0, MAX_ITEMS);
}


// No lookbehind (older Safari fails to load a file that has one): the character
// before the name is captured and skipped instead.
const CALL_WITH_ARG =
  /(^|[^\w.])(result|var|arg|input)\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/g;

interface CallRule {
  /** What the argument is, for the message. */
  what: string;
  names: (ctx: CompletionContext) => Set<string> | undefined;
  missing: (name: string) => string;
}

const CALL_RULES: Record<string, CallRule> = {
  result: {
    what: "ID của khối",
    names: (c) => c.resultIds,
    missing: (name) =>
      `Khối '${name}' không tồn tại hoặc không nằm trước khối này.`,
  },
  var: {
    what: "tên biến tạm",
    names: (c) => c.varNames,
    missing: (name) =>
      `Biến '${name}' không tồn tại hoặc chưa được khai báo. Đặt tên biến tạm ở một khối đứng trước.`,
  },
  arg: {
    what: "tên tham số của lệnh",
    names: (c) => c.argNames,
    missing: (name) => `Lệnh không có tham số '${name}'.`,
  },
  input: {
    what: "ID của ô trong modal",
    names: (c) => c.inputIds,
    missing: (name) => `Modal không có ô '${name}'.`,
  },
};

/**
 * What is wrong in the expressions of a text, so a mistake shows up while it is
 * typed instead of as an empty value at run time (the backend does not fail on
 * an unknown name). Only the calls of the flow are checked, result('id'),
 * var('name'), arg('name') and input('id'), and only against what the flow is
 * known to contain: a name that can not be checked is never reported.
 */
export function diagnose(text: string, ctx: CompletionContext): Diagnostic[] {
  const found: Diagnostic[] = [];

  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf("{{", cursor);
    if (open === -1) break;

    const close = text.indexOf("}}", open + 2);
    const end = close === -1 ? text.length : close;
    const expr = text.slice(open + 2, end);

    for (const m of expr.matchAll(CALL_WITH_ARG)) {
      const fn = m[2];
      const rule = CALL_RULES[fn];
      const name = m[3] ?? m[4];
      const from = open + 2 + (m.index ?? 0) + m[1].length;
      const to = from + m[0].length - m[1].length;

      if (name === undefined || name === "") {
        found.push({
          from,
          to,
          message: `${fn} cần 1 giá trị bắt buộc: ${rule.what}, ví dụ ${fn}('...').`,
        });
        continue;
      }

      const known = rule.names(ctx);
      if (known && !known.has(name)) {
        found.push({ from, to, message: rule.missing(name) });
      }
    }

    cursor = close === -1 ? text.length : close + 2;
  }

  return found;
}

/**
 * Puts the chosen item in the text. The closing braces are added when the
 * expression has none yet, and the caret goes before them when more is typed
 * after the item (a dot, the arguments of a function).
 */
export function applyCompletion(
  text: string,
  completion: Completion,
  item: CompletionItem
): { text: string; caret: number } {
  const head = text.slice(0, completion.from) + item.insert;
  const rest = text.slice(completion.to);

  const nextOpen = rest.indexOf("{{");
  const scope = nextOpen === -1 ? rest : rest.slice(0, nextOpen);
  const closed = scope.includes("}}");

  const inside = item.keepOpen || !!item.caretBack;
  const caretBack = item.caretBack ?? 0;

  if (closed) {
    return { text: head + rest, caret: head.length - caretBack };
  }

  const out = head + "}}" + rest;
  return {
    text: out,
    caret: inside ? head.length - caretBack : head.length + 2,
  };
}
