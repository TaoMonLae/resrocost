import { describe, expect, it } from "vitest";
import {
  assertNoRecipeCycle,
  calculateRecipeCost,
} from "@/lib/services/recipe-cost-service";

describe("recipe costing", () => {
  it("includes component cost, waste, and serving yield", () => {
    const result = calculateRecipeCost({
      components: [
        { convertedBaseQuantity: 500, costPerBaseUnit: 0.02 },
        { convertedBaseQuantity: 2, costPerBaseUnit: 3 },
      ],
      wastePercentage: 20,
      numberOfServings: 4,
    });

    expect(result.directBatchCost.toNumber()).toBe(16);
    expect(result.currentBatchCost.toNumber()).toBe(20);
    expect(result.currentCostPerServing.toNumber()).toBe(5);
  });

  it("rejects circular sub-recipes", () => {
    const edges = new Map<string, string[]>([
      ["sauce", ["stock"]],
      ["stock", ["main"]],
    ]);
    expect(() => assertNoRecipeCycle("main", ["sauce"], edges)).toThrow(
      "Circular sub-recipe",
    );
  });
});
