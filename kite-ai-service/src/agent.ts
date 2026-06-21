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
}): Promise<Response> {
  const mode = opts.mode ?? "editor";
  const result = streamText({
    model: provider(resolveModel(opts.modelKey)),
    system: buildSystemPrompt(opts.flow, opts.context, mode),
    messages: await convertToModelMessages(opts.messages),
    tools: buildTools(mode, opts.appId, opts.cookie),
    stopWhen: stepCountIs(config.maxSteps),
    onError: ({ error }) => console.error("streamText error:", error),
    // Charge the AI credit only once the turn completes successfully. onFinish
    // does not fire when the stream errors, so failed turns are never charged.
    onFinish: async () => {
      const charge = await consumeCredit(
        opts.appId,
        opts.modelKey ?? "",
        opts.cookie,
      );
      if (!charge.ok) {
        console.error("failed to charge AI credit:", charge.message);
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
