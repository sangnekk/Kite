import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  applyCompletion,
  completeAt,
  diagnose,
  CompletionContext,
  openExpression,
  Suggestion,
} from "./expressionEngine";
import { FUNCTIONS, membersOfSchema, ROOT_MEMBERS } from "./expressionModel";

const messageSchema = z.object({
  id: z.string().describe("ID tin nhắn"),
  content: z.string(),
  author: z
    .object({ id: z.string(), username: z.string().describe("Tên") })
    .describe("Người gửi"),
  member: z.object({ nick: z.string() }).optional(),
  tags: z.array(z.string()),
});

const ctx: CompletionContext = {
  roots: ROOT_MEMBERS,
  functions: FUNCTIONS,
  resultMembers: (id) => (id === "abc" ? membersOfSchema(messageSchema) : undefined),
};

const suggestions: Suggestion[] = [
  { label: "User ID", value: "user.id" },
  { label: "Server ID", value: "guild.id" },
  { label: "Tin nhắn", value: "result('abc')" },
  { label: "Biến tạm 'x'", value: "var('x')" },
];

// The caret is the | in the text.
// `plain` is a field with no context (only the values of the editor).
function at(textWithCaret: string, plain = false) {
  const caret = textWithCaret.indexOf("|");
  const text = textWithCaret.replace("|", "");
  return {
    text,
    caret,
    completion: completeAt(text, caret, suggestions, plain ? undefined : ctx),
  };
}

const labels = (c: ReturnType<typeof at>) =>
  c.completion?.items.map((i) => i.label) ?? [];

describe("openExpression", () => {
  test("finds the open braces before the caret", () => {
    expect(openExpression("hi {{user.i", 11)).toEqual({ start: 5, expr: "user.i" });
  });

  test("a closed expression is not open", () => {
    expect(openExpression("{{user.id}} x", 13)).toBeNull();
    expect(openExpression("no braces", 5)).toBeNull();
  });
});

describe("members after a dot", () => {
  test("a root offers its members", () => {
    expect(labels(at("{{user.|"))).toContain("username");
    expect(labels(at("{{user.|"))).toContain("avatar_url");
  });

  test("the typed part narrows the list, prefixes first", () => {
    const res = labels(at("{{user.us|"));
    expect(res[0]).toBe("username");
    expect(res).not.toContain("avatar_url");
  });

  test("the result of a node offers the fields of its schema", () => {
    const res = at("{{result('abc').|");
    expect(labels(res)).toEqual(["id", "content", "author", "member", "tags"]);
  });

  test("nested objects are followed, and the description is the detail", () => {
    const res = at("{{result('abc').author.|");
    expect(labels(res)).toEqual(["id", "username"]);
    expect(res.completion?.items[1].detail).toContain("Tên");
  });

  test("an optional object is followed too", () => {
    expect(labels(at("{{result('abc').member.|"))).toEqual(["nick"]);
  });

  test("works in the middle of a longer expression", () => {
    expect(labels(at("{{upper(result('abc').con|"))).toEqual(["content"]);
    expect(labels(at("{{ user.id + app.user.|"))).toContain("mention");
  });

  test("double quotes and spaces in the call are fine", () => {
    expect(labels(at('{{result( "abc" ).|'))).toContain("content");
  });

  test("a node without a known result, or an unknown name, offers nothing", () => {
    expect(at("{{result('zzz').|").completion).toBeNull();
    expect(at("{{nothing.|").completion).toBeNull();
    expect(at("{{user.nope.|").completion).toBeNull();
    expect(at("{{var('x').|").completion).toBeNull();
  });

  test("leaf fields have no members to follow", () => {
    expect(at("{{user.id.|").completion).toBeNull();
  });

  test("the replaced range is the word after the dot", () => {
    const res = at("{{user.us|");
    expect(res.completion?.from).toBe(7);
    expect(res.completion?.to).toBe(9);
  });
});

describe("the start of an operand", () => {
  test("a typed word finds values, roots and functions", () => {
    const res = labels(at("{{up|"));
    expect(res).toContain("upper");
  });

  test("a root that is not already a value is offered", () => {
    expect(labels(at("{{inter|"))).toContain("interaction");
  });

  test("values of the editor come first", () => {
    const res = at("{{user|");
    expect(res.completion?.items[0].insert).toBe("user.id");
  });

  test("works inside a function call", () => {
    expect(labels(at("{{upper(gui|"))).toContain("Server ID");
  });

  test("an empty operand offers the values, not every function", () => {
    const res = at("{{|");
    expect(res.completion?.items.map((i) => i.insert)).toEqual(suggestions.map((s) => s.value));

    const afterParen = at("{{upper(|");
    expect(afterParen.completion?.items.some((i) => i.kind === "function")).toBe(false);
    expect(afterParen.completion).not.toBeNull();
  });

  test("nothing pops up after a finished operand", () => {
    expect(at("{{user.id |").completion).toBeNull();
    expect(at("{{user.id + |").completion).not.toBeNull();
  });

  test("nothing inside a string", () => {
    expect(at("{{upper('us|").completion).toBeNull();
    expect(at("{{result('ab|").completion).toBeNull();
  });
});

describe("without a context", () => {
  test("behaves like the plain list of values", () => {
    const res = at("{{us|", true);
    expect(res.completion?.items.map((i) => i.insert)).toEqual(["user.id"]);
    // the whole expression after the braces is replaced
    expect(res.completion?.from).toBe(2);
  });

  test("no braces, no completion", () => {
    expect(at("us|", true).completion).toBeNull();
  });
});

describe("applyCompletion", () => {
  const apply = (
    textWithCaret: string,
    pick: number | ((i: { kind: string }) => boolean) = 0
  ) => {
    const res = at(textWithCaret);
    const items = res.completion!.items;
    const item = typeof pick === "number" ? items[pick] : items.find(pick)!;
    const out = applyCompletion(res.text, res.completion!, item);
    return { text: out.text, caret: out.caret, before: out.text.slice(0, out.caret), after: out.text.slice(out.caret) };
  };

  test("a leaf value closes the braces and leaves the caret after them", () => {
    const out = apply("hello {{user.us|");
    expect(out.text).toBe("hello {{user.username}}");
    expect(out.after).toBe("");
  });

  test("an object keeps the caret before the braces for the next dot", () => {
    const out = apply("{{result('abc').au|");
    expect(out.text).toBe("{{result('abc').author}}");
    expect(out.after).toBe("}}");
  });

  test("a function puts the caret between the parentheses", () => {
    const out = apply("{{upp|", (i) => i.kind === "function");
    expect(out.text).toBe("{{upper()}}");
    expect(out.before).toBe("{{upper(");
  });

  test("result( puts the caret between the quotes", () => {
    const out = apply("{{resu|", (i) => i.kind === "function");
    expect(out.text).toBe("{{result('')}}");
    expect(out.before).toBe("{{result('");
  });

  test("braces that are already there are not doubled", () => {
    const res = at("{{user.us|}} tail");
    const out = applyCompletion(res.text, res.completion!, res.completion!.items[0]);
    expect(out.text).toBe("{{user.username}} tail");
  });

  test("a value of the editor replaces the whole word and closes the braces", () => {
    const out = apply("{{gui|", 0);
    expect(out.text).toBe("{{guild.id}}");
  });

  test("a value with members keeps the caret open: result('abc') then a dot", () => {
    const out = apply("{{Tin|");
    expect(out.text).toBe("{{result('abc')}}");
    expect(out.after).toBe("}}");
  });

  test("a second expression after the caret is not taken as closing this one", () => {
    const res = at("{{user.us|  and {{x}}");
    const out = applyCompletion(res.text, res.completion!, res.completion!.items[0]);
    expect(out.text).toBe("{{user.username}}  and {{x}}");
  });
});

describe("membersOfSchema", () => {
  test("lists the fields with their kind and description", () => {
    const members = membersOfSchema(messageSchema);
    const id = members.find((m) => m.name === "id")!;
    expect(id.detail).toBe("văn bản · ID tin nhắn");
    expect(members.find((m) => m.name === "tags")!.detail).toBe("danh sách");
    expect(members.find((m) => m.name === "author")!.members?.length).toBe(2);
  });

  test("nothing for a missing or non-object schema", () => {
    expect(membersOfSchema(undefined)).toEqual([]);
    expect(membersOfSchema(z.string())).toEqual([]);
  });
});

describe("diagnose", () => {
  const known: CompletionContext = {
    ...ctx,
    resultIds: new Set(["abc"]),
    varNames: new Set(["count"]),
    argNames: new Set(["user"]),
    inputIds: new Set(["reason"]),
  };

  const problems = (text: string, c: CompletionContext = known) =>
    diagnose(text, c).map((d) => ({ text: text.slice(d.from, d.to), message: d.message }));

  test("a call with no value says it needs one", () => {
    const res = problems("{{result('')}}");
    expect(res).toHaveLength(1);
    expect(res[0].text).toBe("result('')");
    expect(res[0].message).toContain("result cần 1 giá trị bắt buộc");

    expect(problems("{{result()}}")[0].message).toContain("result cần 1 giá trị bắt buộc");
    expect(problems("{{var('')}}")[0].message).toContain("var cần 1 giá trị bắt buộc");
    expect(problems("{{ arg(  ) }}")[0].message).toContain("arg cần 1 giá trị bắt buộc");
  });

  test("a result of a node that is not before this one", () => {
    const res = problems("{{result('zzz')}}");
    expect(res[0].message).toBe("Khối 'zzz' không tồn tại hoặc không nằm trước khối này.");
    expect(problems("{{result('abc')}}")).toEqual([]);
  });

  test("a temporary variable that was never named", () => {
    expect(problems("{{var('missing')}}")[0].message).toContain("Biến 'missing' không tồn tại hoặc chưa được khai báo");
    expect(problems("{{var('count')}}")).toEqual([]);
  });

  test("an argument of the command and an input of the modal", () => {
    expect(problems("{{arg('nope')}}")[0].message).toBe("Lệnh không có tham số 'nope'.");
    expect(problems("{{arg('user')}}")).toEqual([]);
    expect(problems("{{input('nope')}}")[0].message).toBe("Modal không có ô 'nope'.");
    expect(problems("{{input('reason')}}")).toEqual([]);
  });

  test("a name that can not be checked is never reported", () => {
    const unknown: CompletionContext = { roots: [], functions: [] };
    expect(problems("{{result('zzz')}} {{var('x')}} {{arg('y')}} {{input('z')}}", unknown)).toEqual([]);
    // but an empty value is wrong whatever the flow holds
    expect(problems("{{result('')}}", unknown)).toHaveLength(1);
  });

  test("finds every problem, with the text range of the call", () => {
    const text = "a {{upper(var('x')) + result('abc').id}} b {{result('')}}";
    const res = diagnose(text, known);
    expect(res.map((d) => text.slice(d.from, d.to))).toEqual(["var('x')", "result('')"]);
  });

  test("only inside braces, and a member call is not the function", () => {
    expect(problems("result('') var('x')")).toEqual([]);
    expect(problems("{{user.result('')}}")).toEqual([]);
    expect(problems("{{myresult('')}}")).toEqual([]);
  });

  test("a non literal argument is left alone", () => {
    expect(problems("{{result(x)}} {{var('a' + b)}}")).toEqual([]);
  });

  test("an unfinished expression is still read", () => {
    expect(problems("{{result('')")).toHaveLength(1);
  });
});
