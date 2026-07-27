import { describe, expect, it } from "vitest";
import {
  calculateChannelEconomics,
  calculateMenuEconomics,
} from "@/lib/services/pricing-service";

describe("menu pricing", () => {
  it("calculates full cost, profit, and target prices", () => {
    const result = calculateMenuEconomics({
      recipeCostPerServing: 4,
      packagingCost: 1,
      directLaborCost: 2,
      sellingPrice: 14,
      targetFoodCostPercentage: 25,
      targetProfitMargin: 50,
    });
    expect(result.currentFullCost.toNumber()).toBe(7);
    expect(result.currentProfit.toNumber()).toBe(7);
    expect(result.currentProfitMargin.toNumber()).toBe(50);
    expect(result.suggestedPriceByFoodCost.toNumber()).toBe(16);
    expect(result.suggestedPriceByMargin.toNumber()).toBe(14);
  });

  it("deducts channel fees before calculating profit", () => {
    const result = calculateChannelEconomics({
      customerPrice: 20,
      fullCost: 8,
      commissionPercentage: 20,
      paymentProcessingPercentage: 2,
      fixedTransactionFee: 1,
      packagingSurcharge: 0.5,
    });
    expect(result.channelFees.toNumber()).toBe(5.4);
    expect(result.netRevenue.toNumber()).toBe(15.1);
    expect(result.profit.toNumber()).toBe(7.1);
  });
});
