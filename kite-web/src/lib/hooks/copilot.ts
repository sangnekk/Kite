import { useQuery } from "@tanstack/react-query";
import { AIModelListResponse } from "../types/wire.gen";

const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:3001";

/**
 * The models the AI copilot can run. They come from the copilot service itself
 * because it only runs DeepSeek models, while kite-service also lists the models
 * of other providers for the AI nodes of bot flows.
 */
export function useCopilotModels(): AIModelListResponse | undefined {
  const query = useQuery({
    queryKey: ["ai", "copilot-models"],
    queryFn: async () => {
      const res = await fetch(`${AI_SERVICE_URL}/models`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Không tải được danh sách mô hình (${res.status})`);
      }
      return (await res.json()) as AIModelListResponse;
    },
    staleTime: 60_000,
  });

  return query.data;
}
