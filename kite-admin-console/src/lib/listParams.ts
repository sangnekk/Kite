// List state (page, page size, search, filters) lives in the URL, so a filtered
// view survives a reload, can be shared and works with the back button.

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

export interface ListState {
  page: number
  pageSize: number
  search: string
  filters: Record<string, string>
}

function positiveInt(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n >= 1 ? n : null
}

export function parseListState(
  params: URLSearchParams,
  filterKeys: readonly string[],
  defaultPageSize = DEFAULT_PAGE_SIZE
): ListState {
  const requestedSize = positiveInt(params.get("page_size"))
  const filters: Record<string, string> = {}
  for (const key of filterKeys) {
    filters[key] = params.get(key) ?? ""
  }

  return {
    page: positiveInt(params.get("page")) ?? 1,
    pageSize: requestedSize !== null && requestedSize <= 200 ? requestedSize : defaultPageSize,
    search: params.get("search") ?? "",
    filters,
  }
}

/**
 * Applies a change to the URL parameters. Changing anything but the page
 * itself goes back to page 1, and values equal to their default are left out
 * so URLs stay short.
 */
export function updateListParams(
  current: URLSearchParams,
  change: Partial<{ page: number; pageSize: number; search: string }> & {
    filters?: Record<string, string>
  },
  defaultPageSize = DEFAULT_PAGE_SIZE
): URLSearchParams {
  const next = new URLSearchParams(current)

  const set = (key: string, value: string | null) => {
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
  }

  if (change.pageSize !== undefined) {
    set("page_size", change.pageSize === defaultPageSize ? null : String(change.pageSize))
  }
  if (change.search !== undefined) set("search", change.search.trim())
  for (const [key, value] of Object.entries(change.filters ?? {})) set(key, value)

  if (change.page !== undefined) {
    set("page", change.page <= 1 ? null : String(change.page))
  } else {
    next.delete("page")
  }
  return next
}

/** The query parameters the API understands for a list state. */
export function apiParams(state: ListState): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: state.page,
    page_size: state.pageSize,
  }
  if (state.search) params.search = state.search
  for (const [key, value] of Object.entries(state.filters)) {
    if (value) params[key] = value
  }
  return params
}

export interface PageResult<T> {
  items: T[]
  total: number
}

/**
 * Loads every page of a list (for "export everything that matches"), capped so
 * a huge table cannot freeze the browser.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PageResult<T>>,
  { pageSize = 100, max = 5000 }: { pageSize?: number; max?: number } = {}
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const result = await fetchPage(page, pageSize)
    items.push(...result.items)

    if (items.length >= result.total || result.items.length === 0) {
      return { items: items.slice(0, max), truncated: false }
    }
    if (items.length >= max) {
      return { items: items.slice(0, max), truncated: true }
    }
  }
}
