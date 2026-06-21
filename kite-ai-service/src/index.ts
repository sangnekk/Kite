import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { streamChat } from "./agent";
import { config } from "./config";
import { checkCredit } from "./kite";

const app = new Elysia()
  .use(
    cors({
      origin: config.webOrigin,
      credentials: true,
      allowedHeaders: ["content-type"],
    })
  )
  .get("/health", () => "ok")
  .post("/chat", async ({ request, body, set }) => {
    const cookie = request.headers.get("cookie") ?? "";
    const {
      messages = [],
      flow = null,
      model,
      appId,
      context,
      mode,
    } = (body ?? {}) as {
      messages?: any[];
      flow?: unknown;
      model?: string;
      appId?: string;
      context?: string;
      mode?: string;
    };

    if (!appId) {
      set.status = 400;
      return { error: "appId is required" };
    }

    // Gate server-side (plan ai_included + daily budget) BEFORE any LLM call.
    // The actual charge happens in streamChat's onFinish, so turns that error
    // out (e.g. gateway rate limit) are never charged.
    const credit = await checkCredit(appId, model ?? "", cookie);
    if (!credit.ok) {
      set.status = 403;
      return { error: credit.message ?? "AI is not available on your plan" };
    }

    return await streamChat({
      messages,
      flow,
      modelKey: model,
      appId,
      cookie,
      context,
      mode,
    });
  })
  .listen(config.port);

console.log(
  `🦊 kite-ai-service running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
