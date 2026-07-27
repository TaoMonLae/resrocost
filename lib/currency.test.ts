import { describe, expect, it } from "vitest";
import {
  getCurrencyLocale,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "./currency";
import { formatMoney } from "./utils";

describe("currency configuration", () => {
  it("accepts every currency exposed in the restaurant forms", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(isSupportedCurrency(currency.code)).toBe(true);
    }
    expect(isSupportedCurrency("ABC")).toBe(false);
  });

  it("uses a local display format for the selected currency", () => {
    expect(getCurrencyLocale("MYR")).toBe("ms-MY");
    expect(formatMoney(12.5, "MYR")).toContain("RM");
  });

  it("does not crash when formatting a legacy invalid currency value", () => {
    expect(formatMoney(12.5, "??")).toContain("??");
  });
});
