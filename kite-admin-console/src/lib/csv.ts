export type CsvValue = string | number | boolean | null | undefined

/**
 * Quotes a cell for CSV. Cells that start with a formula character are
 * prefixed with an apostrophe so a spreadsheet never executes user supplied
 * text such as "=HYPERLINK(...)" from an app name or a log message.
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return ""
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") {
    text = `'${text}`
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","))
  return lines.join("\r\n") + "\r\n"
}

/** Downloads text as a UTF-8 file (with a BOM so Excel reads Vietnamese correctly). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
