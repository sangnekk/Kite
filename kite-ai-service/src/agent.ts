import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { config, resolveModel } from "./config";
import { consumeCredit } from "./kite";
import { buildSystemPrompt } from "./prompt";
import { buildTools } from "./tools";
import { createDeepSeek } from "@ai-sdk/deepseek";

// streamChat runs one agent turn and returns a UIMessage stream Response for the
// browser's useChat to consume (rendered with ai-elements).

const provider = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function streamChat(opts: {
  messages: UIMessage[];
  flow: unknown;
  modelKey?: string;
  appId: string;
  cookie: string;
  context?: string;
  mode?: string;
  // Aborts when the browser disconnects (F5 / navigates away) so we stop the
  // generation instead of finishing (and charging) a turn nobody will receive.
  abortSignal?: AbortSignal;
  // Called exactly once when the turn reaches a terminal state (finished, aborted,
  // or errored). The caller uses this to release its per-app concurrency slot.
  onSettled?: () => void;
}): Promise<Response> {
  const mode = opts.mode ?? "editor";

  // Ensure onSettled runs at most once regardless of which terminal callback fires.
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    opts.onSettled?.();
  };

  const result = streamText({
    model: provider(resolveModel(opts.modelKey)),
    system: buildSystemPrompt(opts.flow, opts.context, mode),
    messages: await convertToModelMessages(opts.messages),
    tools: buildTools(mode, opts.appId, opts.cookie),
    stopWhen: stepCountIs(config.maxSteps),
    // When the browser disconnects mid-stream, abort the model call: this stops
    // burning provider tokens AND skips onFinish (onAbort fires instead), so the
    // abandoned turn — whose result the user will never receive — is not charged.
    abortSignal: opts.abortSignal,
    onError: ({ error }) => {
      console.error(`[ai] streamText error (app=${opts.appId}):`, error);
      settle();
    },
    // Tagged log so the abort-vs-finish ratio is observable in production; see the
    // disconnect-propagation assumption documented at the /chat call site.
    onAbort: () => {
      console.warn(`[ai] turn aborted (client disconnected, app=${opts.appId}); not charging`);
      settle();
    },
    // Charge the AI credit only once the turn completes successfully. onFinish
    // does not fire when the stream is aborted or errors, so an abandoned or
    // failed turn is never charged.
    onFinish: async () => {
      try {
        const charge = await consumeCredit(
          opts.appId,
          opts.modelKey ?? "",
          opts.cookie,
        );
        if (!charge.ok) {
          // Charge can legitimately fail here with ai_daily_limit: at the budget
          // boundary, concurrent turns that all passed the read-only pre-stream
          // gate can finish after the budget is already spent. Those turns were
          // delivered to the user un-charged — an accepted trade-off, bounded by
          // the per-app concurrency cap (config.maxConcurrentChatsPerApp) so the
          // overspend is at most a handful of turns, not unbounded.
          console.error(
            `[ai] AI credit not charged (app=${opts.appId}):`,
            charge.message,
          );
        }
      } finally {
        // Marker for the abort-vs-finish ratio (see /chat assumption note).
        console.log(`[ai] turn finished (app=${opts.appId})`);
        settle();
      }
    },
  });

  // Surface errors (e.g. gateway rate limit) as a stream error part instead of
  // crashing the service, with a friendly message for the UI.
  return result.toUIMessageStreamResponse({
    onError: (error) => friendlyError(error),
  });
}

function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/rate.?limit|429|free tier/i.test(msg)) {
    return "Mô hình AI đang bị giới hạn tốc độ (rate limit) hoặc hết credit gateway. Thử lại sau, đổi model, hoặc nâng cấp credit Vercel AI Gateway.";
  }
  return msg || "Đã xảy ra lỗi khi gọi AI.";
}
