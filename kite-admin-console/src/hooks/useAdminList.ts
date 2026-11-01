import { useCallback } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { fetchAllPages } from "@/lib/listParams"
import type { Paged } from "@/lib/types"
import type { useListState } from "./useListState"

/**
 * Loads one page of an admin list for the current URL state, and provides the
 * props shared by every DataTable. The previous page stays on screen while the
 * next one loads, so paging does not flash.
 */
export function useAdminList<T>(resource: string, path: string, list: ReturnType<typeof useListState>) {
  const query = useQuery({
    queryKey: [resource, list.params],
    queryFn: ({ signal }) => api<Paged<T>>(path, { params: list.params, signal }),
    placeholderData: keepPreviousData,
  })

  const exportAll = useCallback(
    () =>
      fetchAllPages<T>((page, size) =>
        api<Paged<T>>(path, { params: { ...list.params, page, page_size: size } })
      ),
    [path, list.params]
  )

  return {
    query,
    tableProps: {
      data: query.data?.items,
      total: query.data?.total ?? 0,
      page: list.page,
      pageSize: list.pageSize,
      onPageChange: list.setPage,
      onPageSizeChange: list.setPageSize,
      isLoading: query.isPending,
      isFetching: query.isFetching,
      error: query.error,
      onRefresh: () => void query.refetch(),
      exportAll,
      filtered: list.hasActiveFilters,
      onResetFilters: list.reset,
    },
  }
}
