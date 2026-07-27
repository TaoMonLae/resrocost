import { describe, expect, it } from "vitest";
import {
  effectiveCostPerBaseUnit,
  ingredientCostUsed,
  usableQuantity,
} from "./ingredient-cost-service";

describe("ingredient costing", () => {
  it("calculates cost used from converted quantity", () => {
    const unitCost = effectiveCostPerBaseUnit(24, 10_000, 0);
    expect(ingredientCostUsed(unitCost, 250).toNumber()).toBeCloseTo(0.6);
  });

  it("accounts for waste in effective unit cost", () => {
    expect(usableQuantity(10_000, 10).toNumber()).toBe(9_000);
    expect(effectiveCostPerBaseUnit(24, 10_000, 10).toNumber()).toBeCloseTo(
      24 / 9_000,
    );
  });

  it("rejects 100 percent waste", () => {
    expect(() => usableQuantity(10, 100)).toThrow();
  });
});
