import { describe, expect, it } from "vitest"
import { csvCell, toCsv } from "./csv"
import {
  discordAvatarUrl,
  formatDateTime,
  formatDayMonth,
  formatLimit,
  initials,
  percentChange,
} from "./format"

describe("csv", () => {
  it("quotes cells that contain separators, quotes or newlines", () => {
    expect(csvCell("plain")).toBe("plain")
    expect(csvCell("a,b")).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"')
  })

  it("renders empty values and numbers", () => {
    expect(csvCell(null)).toBe("")
    expect(csvCell(undefined)).toBe("")
    expect(csvCell(0)).toBe("0")
    expect(csvCell(false)).toBe("false")
  })

  it("neutralises spreadsheet formulas in user supplied text", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"")
    expect(csvCell("+1+1")).toBe("'+1+1")
    expect(csvCell("-2")).toBe("'-2")
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)")
  })

  it("does not touch negative numbers", () => {
    expect(csvCell(-5)).toBe("-5")
  })

  it("builds a table with CRLF lines", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"], [null, 2]])).toBe('a,b\r\n1,"x,y"\r\n,2\r\n')
  })
})

describe("format", () => {
  it("computes a change against a baseline", () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(0, 0)).toBe(0)
    expect(percentChange(10, 0)).toBeNull()
  })

  it("shows -1 as unlimited", () => {
    expect(formatLimit(-1)).toBe("Không giới hạn")
    expect(formatLimit(0)).toBe("0")
  })

  it("is forgiving with bad dates", () => {
    expect(formatDateTime(null)).toBe("—")
    expect(formatDateTime("not a date")).toBe("—")
    expect(formatDateTime("2026-11-04T10:00:00Z")).not.toBe("—")
  })

  it("formats chart days without timezone shifts", () => {
    expect(formatDayMonth("2026-11-04")).toBe("04/11")
    expect(formatDayMonth("weird")).toBe("weird")
  })

  it("builds avatar urls and initials", () => {
    expect(discordAvatarUrl("123", "abc")).toBe("https://cdn.discordapp.com/avatars/123/abc.png?size=64")
    expect(discordAvatarUrl("123", null)).toBeNull()
    expect(initials("Nguyen Van An")).toBe("NA")
    expect(initials("  ")).toBe("?")
    expect(initials("solo")).toBe("S")
  })
})
