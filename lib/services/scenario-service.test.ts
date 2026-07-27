import { describe, expect, it } from "vitest";
import { simulateMenuScenario } from "@/lib/services/scenario-service";

describe("scenario simulator", () => {
  it("keeps live values untouched and returns adjusted economics", () => {
    const result = simulateMenuScenario({
      currentFoodCost: 4,
      currentFullCost: 7,
      sellingPrice: 15,
      ingredientPriceChangePercentage: 10,
      sellingPriceChangePercentage: 5,
      commissionPercentage: 20,
      monthlySalesVolume: 100,
      fixedExpenses: 300,
    });
    expect(result.adjustedFoodCost.toNumber()).toBe(4.4);
    expect(result.adjustedPrice.toNumber()).toBe(15.75);
    expect(result.profitPerSale.toNumber()).toBe(5.2);
    expect(result.monthlyProfit.toNumber()).toBe(220);
    expect(result.breakEvenUnits?.toNumber()).toBe(58);
  });
});
