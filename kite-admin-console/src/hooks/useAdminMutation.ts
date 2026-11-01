import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage } from "@/lib/api"

interface Options<TData, TVars> {
  /** Query keys (prefixes) to refresh once the change went through. */
  invalidate?: QueryKey[]
  success?: string | ((data: TData, vars: TVars) => string)
  /**
   * Toast the error. Turn it off when the caller shows the error itself, for
   * instance a ConfirmDialog, which keeps the dialog open with the message.
   */
  toastError?: boolean
}

export function useAdminMutation<TVars = void, TData = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  { invalidate = [], success, toastError = true }: Options<TData, TVars> = {}
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: async (data, vars) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      if (success) toast.success(typeof success === "function" ? success(data, vars) : success)
    },
    onError: (error) => {
      if (toastError) toast.error(errorMessage(error))
    },
  })
}
