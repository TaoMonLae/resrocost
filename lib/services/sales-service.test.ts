import { describe, expect, it } from "vitest";
import {
  calculateSaleLineSnapshot,
  expandRecipeConsumption,
} from "@/lib/services/sales-service";

describe("sale snapshots", () => {
  it("freezes line economics at the time of sale", () => {
    const result = calculateSaleLineSnapshot({
      quantity: 2,
      sellingPrice: 20,
      foodCost: 4,
      fullCost: 8,
      commissionPercentage: 10,
      fixedTransactionFee: 1,
    });
    expect(result.netSales.toNumber()).toBe(40);
    expect(result.fullCostSnapshot.toNumber()).toBe(16);
    expect(result.channelCommissionSnapshot.toNumber()).toBe(4);
    expect(result.otherChannelFeesSnapshot.toNumber()).toBe(2);
    expect(result.calculatedProfitSnapshot.toNumber()).toBe(18);
  });

  it("expands nested recipe use to base ingredients", () => {
    const totals = expandRecipeConsumption({
      recipeId: "burger",
      servingsSold: 2,
      recipeServings: new Map([["burger", 4], ["sauce", 10]]),
      recipeYields: new Map([["burger", 4], ["sauce", 1000]]),
      componentsByRecipe: new Map([
        ["burger", [
          { recipeId: "burger", ingredientId: "bun", convertedBaseQuantity: 4 },
          { recipeId: "burger", subRecipeId: "sauce", convertedBaseQuantity: 200 },
        ]],
        ["sauce", [
          { recipeId: "sauce", ingredientId: "tomato", convertedBaseQuantity: 500 },
        ]],
      ]),
    });
    expect(totals.get("bun")?.toNumber()).toBe(2);
    expect(totals.get("tomato")?.toNumber()).toBe(50);
  });
});
