import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { streamChat } from "./agent";
import { config } from "./config";
import { checkCredit } from "./kite";

// Per-app count of /chat turns currently streaming. Used to cap concurrency so a
// burst can't run more LLM calls than the daily credit budget allows (see
// config.maxConcurrentChatsPerApp). Single-threaded JS, so no locking needed.
const inFlightByApp = new Map<string, number>();

function acquireChatSlot(appId: string): boolean {
  const current = inFlightByApp.get(appId) ?? 0;
  if (current >= config.maxConcurrentChatsPerApp) return false;
  inFlightByApp.set(appId, current + 1);
  return true;
}

function releaseChatSlot(appId: string): void {
  const current = inFlightByApp.get(appId) ?? 0;
  if (current <= 1) inFlightByApp.delete(appId);
  else inFlightByApp.set(appId, current - 1);
}

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

    // Cap concurrent turns per app. checkCredit above is read-only and doesn't
    // reserve budget, so without this a burst would all pass the gate and all run
    // the (paid) LLM provider before any of them charges. The slot is released
    // when the stream settles (onSettled below) or if streamChat throws.
    if (!acquireChatSlot(appId)) {
      set.status = 429;
      return {
        error:
          "Quá nhiều yêu cầu AI đang xử lý cho ứng dụng này. Vui lòng đợi lượt hiện tại hoàn tất rồi thử lại.",
      };
    }

    // Release the acquired slot exactly once. Both the terminal-callback path
    // (onSettled) and the synchronous-throw path (catch) can fire for the same
    // turn — e.g. if streamText has already started but a later line throws —
    // so guard against a double release that would under-count the cap.
    let slotReleased = false;
    const releaseSlot = () => {
      if (slotReleased) return;
      slotReleased = true;
      releaseChatSlot(appId);
    };

    try {
      return await streamChat({
        messages,
        flow,
        modelKey: model,
        appId,
        cookie,
        context,
        mode,
        // Propagate client disconnects (F5 / leaving the page) so an abandoned turn
        // is aborted, not finished-and-charged.
        //
        // ASSUMPTION (verified on Bun 1.3.x + Elysia 1.4.x): Bun aborts
        // request.signal when the HTTP client disconnects mid-stream. This is the
        // only trigger for the not-charged-on-abandon behavior. If a future Bun /
        // Elysia stops propagating disconnects to request.signal, onAbort simply
        // never fires and the turn finishes-and-charges as normal — no crash, no
        // regression, just the lost optimization. To confirm it still works in
        // production, watch the ratio of "[ai] turn aborted" to "[ai] turn finished"
        // logs (agent.ts): a healthy stream of aborts means disconnects propagate.
        abortSignal: request.signal,
        // Release the concurrency slot once the turn finishes, aborts, or errors.
        onSettled: releaseSlot,
      });
    } catch (err) {
      // streamChat threw before returning the stream (so onSettled may never
      // fire); free the slot here. releaseSlot is idempotent, so this is safe
      // even if a terminal callback also fired.
      releaseSlot();
      throw err;
    }
  })
  .listen(config.port);

console.log(
  `🦊 kite-ai-service running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
