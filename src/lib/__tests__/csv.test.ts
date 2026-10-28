import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("Mumbai, MH")).toBe('"Mumbai, MH"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("guards against spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+91 98450 12345")).toBe("'+91 98450 12345");
    expect(csvCell("@sum")).toBe("'@sum");
  });

  it("keeps numbers numeric (including negatives) and formats dates as YYYY-MM-DD", () => {
    expect(csvCell(-1250.5)).toBe("-1250.5");
    expect(csvCell(new Date("2026-10-29T10:00:00Z"))).toBe("2026-10-29");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });
});

describe("toCsv", () => {
  it("writes a BOM, header row and CRLF lines", () => {
    const csv = toCsv(["Name", "Value"], [["Ananya Iyer", 500000]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿Name,Value\r\nAnanya Iyer,500000\r\n");
  });
});
