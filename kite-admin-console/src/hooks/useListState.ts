import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import { apiParams, parseListState, updateListParams, DEFAULT_PAGE_SIZE } from "@/lib/listParams"

/**
 * Page, page size, search and filters of a list, kept in the URL. `filterKeys`
 * must be a module level constant.
 */
export function useListState(filterKeys: readonly string[], defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [params, setParams] = useSearchParams()

  const state = useMemo(
    () => parseListState(params, filterKeys, defaultPageSize),
    [params, filterKeys, defaultPageSize]
  )

  const update = useCallback(
    (change: Parameters<typeof updateListParams>[1]) =>
      setParams((current) => updateListParams(current, change, defaultPageSize), { replace: true }),
    [setParams, defaultPageSize]
  )

  const setPage = useCallback((page: number) => update({ page }), [update])
  const setPageSize = useCallback((pageSize: number) => update({ pageSize }), [update])
  const setSearch = useCallback((search: string) => update({ search }), [update])
  const setFilter = useCallback((key: string, value: string) => update({ filters: { [key]: value } }), [update])

  const hasActiveFilters = state.search !== "" || Object.values(state.filters).some(Boolean)
  const reset = useCallback(
    () =>
      update({
        search: "",
        filters: Object.fromEntries(filterKeys.map((k) => [k, ""])),
      }),
    [update, filterKeys]
  )

  return {
    ...state,
    params: useMemo(() => apiParams(state), [state]),
    hasActiveFilters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    reset,
  }
}
