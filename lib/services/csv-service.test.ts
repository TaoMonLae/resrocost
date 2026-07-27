import { describe, expect, it } from "vitest";
import {
  parseCsv,
  serializeCsv,
  validateCsvFile,
} from "@/lib/services/csv-service";

describe("CSV service", () => {
  it("parses quoted values and escaped quotes", () => {
    const result = parseCsv('name,notes\n"Tomato, red","He said ""fresh"""\n');
    expect(result.rows[0]).toEqual({
      name: "Tomato, red",
      notes: 'He said "fresh"',
    });
  });

  it("escapes formulas and commas on export", () => {
    const csv = serializeCsv(["name", "value"], [{ name: "A, B", value: "=1+1" }]);
    expect(csv).toContain('"A, B"');
    expect(csv).toContain("'=1+1");
  });

  it("rejects oversized or non-CSV uploads", () => {
    expect(() => validateCsvFile({ size: 10, type: "image/png", name: "x.png" })).toThrow();
    expect(() => validateCsvFile({ size: 3_000_000, type: "text/csv", name: "x.csv" })).toThrow("upload limit");
  });
});
