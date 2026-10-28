/**
 * Minimal RFC 4180 CSV writer.
 * - Quotes fields containing commas, quotes or line breaks; doubles embedded quotes.
 * - Neutralises spreadsheet formula injection: text starting with = + - @ (or tab/CR) is prefixed with '.
 *   Numbers are written as-is, so negative values stay numeric.
 * - Uses CRLF line endings and a UTF-8 BOM so Excel opens Indian names and ₹ correctly.
 */
export type CsvValue = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export const EXPORT_ROW_LIMIT = 5000;

export function csvResponse(csv: string, filenameBase: string, totalRows: number, exportedRows: number) {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Total-Count": String(totalRows),
      "X-Exported-Count": String(exportedRows),
    },
  });
}
