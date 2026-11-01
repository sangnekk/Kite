import { apiRequest } from "@/lib/api/client";
import type { Diagnostic } from "@/lib/flow/expressionEngine";
import { useAppId } from "@/lib/hooks/params";
import type {
  ExpressionCheckRequest,
  ExpressionCheckResponse,
} from "@/lib/types/wire.gen";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/** How long the text has to rest before it is sent, so typing does not ask each key. */
export const EXPRESSION_CHECK_DELAY_MS = 600;

/** Only text with an expression in it is worth asking about. */
export function hasExpression(text: string): boolean {
  return text.includes("{{");
}

function useRested<T>(value: T, delay: number): T {
  const [rested, setRested] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setRested(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return rested;
}

/**
 * What the backend finds wrong in the expressions of a text: syntax, a function
 * or field that does not exist, a value this kind of flow does not have. It asks
 * once the text has rested, remembers the answer for the text, and says nothing
 * while it waits or when the server can not be reached (the checks that run in
 * the browser still work then).
 */
export function useExpressionProblems(
  text: string,
  flowContext: string,
): Diagnostic[] {
  const appId = useAppId();
  const rested = useRested(text, EXPRESSION_CHECK_DELAY_MS);

  const query = useQuery({
    queryKey: ["apps", appId, "expressions", flowContext, rested],
    queryFn: async () => {
      const body: ExpressionCheckRequest = {
        text: rested,
        context: flowContext,
      };
      const res = await apiRequest<ExpressionCheckResponse>(
        `/v1/apps/${appId}/expressions/check`,
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        },
      );
      return res.success ? res.data.problems : [];
    },
    enabled: !!appId && hasExpression(rested),
    // The answer depends on the text only.
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });

  // The answer is about the text that was sent: once the text moves on, its
  // positions no longer fit.
  if (rested !== text || !hasExpression(text)) return [];
  return query.data ?? [];
}

/** The two lists of problems as one, without the same problem twice. */
export function mergeDiagnostics(
  a: Diagnostic[],
  b: Diagnostic[],
): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];

  for (const d of [...a, ...b]) {
    const key = `${d.from}:${d.to}:${d.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }

  return out;
}
