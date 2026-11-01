import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Plan } from "@/lib/types"

export const PLANS_KEY = ["plans"] as const

/** Every plan, archived ones included, in display order. */
export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEY,
    queryFn: ({ signal }) => api<Plan[]>("/plans", { signal }),
    staleTime: 60_000,
  })
}
