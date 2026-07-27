import { describe, expect, it } from "vitest";
import { InventoryTransactionType } from "@prisma/client";
import {
  nextStockQuantity,
  weightedAverageCost,
} from "./inventory-service";

describe("weighted-average inventory", () => {
  it("blends incoming cost with stock on hand", () => {
    const cost = weightedAverageCost({
      currentQuantity: 10,
      currentUnitCost: 2,
      incomingQuantity: 10,
      incomingUnitCost: 4,
    });
    expect(cost.toNumber()).toBe(3);
  });

  it("blocks negative stock by default", () => {
    expect(() =>
      nextStockQuantity({
        currentQuantity: 5,
        type: InventoryTransactionType.ADJUSTMENT_OUT,
        baseQuantity: 6,
        allowNegative: false,
      }),
    ).toThrow("negative");
  });
});
