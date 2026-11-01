import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api"
import { router } from "./router"

// A 401 from anywhere means the session ended: re-check who we are so the
// login screen takes over instead of every page failing separately.
function handleUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    void queryClient.resetQueries({ queryKey: ["me"] })
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        // Only transient failures are worth retrying, a 4xx will not get better.
        failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
)
