import { describe, expect, test } from "bun:test";
import { hasExpression, mergeDiagnostics } from "./expressionCheck";

describe("hasExpression", () => {
  test("only text with an opening brace pair is worth asking about", () => {
    expect(hasExpression("{{user.id}}")).toBe(true);
    expect(hasExpression("hi {{")).toBe(true);
    expect(hasExpression("no braces")).toBe(false);
    expect(hasExpression("{ single }")).toBe(false);
    expect(hasExpression("")).toBe(false);
  });
});

describe("mergeDiagnostics", () => {
  const a = { from: 2, to: 6, message: "one" };
  const b = { from: 8, to: 9, message: "two" };

  test("keeps both lists, the first one first", () => {
    expect(mergeDiagnostics([a], [b])).toEqual([a, b]);
  });

  test("the same problem found twice is shown once", () => {
    expect(mergeDiagnostics([a], [{ ...a }, b])).toEqual([a, b]);
  });

  test("the same range with another message is a different problem", () => {
    const other = { ...a, message: "other" };
    expect(mergeDiagnostics([a], [other])).toHaveLength(2);
  });

  test("empty lists", () => {
    expect(mergeDiagnostics([], [])).toEqual([]);
  });
});
