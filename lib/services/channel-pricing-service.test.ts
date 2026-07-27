import { describe, expect, it } from "vitest";
import { requiredChannelPrice } from "@/lib/services/channel-pricing-service";

describe("required channel price", () => {
  it("supports zero commission and fixed fees", () => {
    expect(requiredChannelPrice({ requiredNetRevenue: 10 }).toNumber()).toBe(10);
    expect(requiredChannelPrice({ requiredNetRevenue: 10, fixedTransactionFee: 2 }).toNumber()).toBe(12);
  });

  it("supports high percentage fees below 100%", () => {
    expect(requiredChannelPrice({ requiredNetRevenue: 10, commissionPercentage: 50 }).toNumber()).toBe(20);
    expect(() => requiredChannelPrice({ requiredNetRevenue: 10, commissionPercentage: 100 })).toThrow("below 100%");
  });
});
