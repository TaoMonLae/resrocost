import { describe, expect, it } from "vitest";
import {
  calculateMarginAndMarkup,
  roundSuggestedPrice,
} from "@/lib/services/profit-service";

describe("profit helpers", () => {
  it("distinguishes margin from markup", () => {
    const result = calculateMarginAndMarkup({ revenue: 10, cost: 5 });
    expect(result.marginPercentage.toNumber()).toBe(50);
    expect(result.markupPercentage.toNumber()).toBe(100);
  });

  it("supports operational and psychological rounding", () => {
    expect(roundSuggestedPrice(8.33, "NEAREST_050").toNumber()).toBe(8.5);
    expect(roundSuggestedPrice(8.33, "ENDING_90").toNumber()).toBe(8.9);
    expect(roundSuggestedPrice(8.99, "ENDING_99").toNumber()).toBe(8.99);
  });
});
