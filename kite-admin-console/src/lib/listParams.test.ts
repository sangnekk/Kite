import { describe, expect, it } from "vitest"
import { apiParams, fetchAllPages, parseListState, updateListParams } from "./listParams"

const q = (s: string) => new URLSearchParams(s)

describe("parseListState", () => {
  it("uses defaults for an empty URL", () => {
    expect(parseListState(q(""), ["status"])).toEqual({
      page: 1,
      pageSize: 20,
      search: "",
      filters: { status: "" },
    })
  })

  it("reads page, size, search and filters", () => {
    const state = parseListState(q("page=3&page_size=50&search=abc&status=paid"), ["status", "level"])
    expect(state).toEqual({ page: 3, pageSize: 50, search: "abc", filters: { status: "paid", level: "" } })
  })

  it("ignores garbage instead of breaking the page", () => {
    for (const bad of ["page=0", "page=-2", "page=abc", "page=1.5", "page="]) {
      expect(parseListState(q(bad), []).page).toBe(1)
    }
    expect(parseListState(q("page_size=0"), []).pageSize).toBe(20)
    expect(parseListState(q("page_size=99999"), []).pageSize).toBe(20)
    expect(parseListState(q("page_size=x"), [], 50).pageSize).toBe(50)
  })
})

describe("updateListParams", () => {
  it("goes back to page 1 when a filter or the search changes", () => {
    expect(updateListParams(q("page=4&status=paid"), { filters: { status: "failed" } }).toString()).toBe(
      "status=failed"
    )
    expect(updateListParams(q("page=4"), { search: "bob" }).toString()).toBe("search=bob")
    expect(updateListParams(q("page=4"), { pageSize: 50 }).toString()).toBe("page_size=50")
  })

  it("keeps the page when only the page changes", () => {
    expect(updateListParams(q("search=bob"), { page: 3 }).toString()).toBe("search=bob&page=3")
    expect(updateListParams(q("page=3"), { page: 1 }).toString()).toBe("")
  })

  it("leaves defaults and empty values out of the URL", () => {
    expect(updateListParams(q("page_size=50"), { pageSize: 20 }).toString()).toBe("")
    expect(updateListParams(q("status=paid"), { filters: { status: "" } }).toString()).toBe("")
    expect(updateListParams(q("search=a"), { search: "   " }).toString()).toBe("")
  })

  it("does not mutate its input", () => {
    const current = q("page=2")
    updateListParams(current, { search: "x" })
    expect(current.toString()).toBe("page=2")
  })
})

describe("apiParams", () => {
  it("sends only the filters that are set", () => {
    expect(
      apiParams({ page: 2, pageSize: 20, search: "", filters: { status: "paid", level: "" } })
    ).toEqual({ page: 2, page_size: 20, status: "paid" })
  })
})

describe("fetchAllPages", () => {
  const source = (n: number) => async (page: number, size: number) => {
    const all = Array.from({ length: n }, (_, i) => i)
    return { items: all.slice((page - 1) * size, page * size), total: n }
  }

  it("walks every page", async () => {
    const result = await fetchAllPages(source(250))
    expect(result.items).toHaveLength(250)
    expect(result.truncated).toBe(false)
    expect(result.items[249]).toBe(249)
  })

  it("handles empty and exact multiples", async () => {
    expect((await fetchAllPages(source(0))).items).toEqual([])
    expect((await fetchAllPages(source(200))).items).toHaveLength(200)
  })

  it("stops at the cap and says so", async () => {
    const result = await fetchAllPages(source(1000), { pageSize: 100, max: 300 })
    expect(result.items).toHaveLength(300)
    expect(result.truncated).toBe(true)
  })

  it("does not loop forever if the server returns nothing", async () => {
    const result = await fetchAllPages(async () => ({ items: [], total: 99 }))
    expect(result.items).toEqual([])
  })
})
