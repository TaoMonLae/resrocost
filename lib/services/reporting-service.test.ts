import { describe, expect, it } from "vitest";
import { MenuEngineeringClass } from "@prisma/client";
import {
  calculateBreakEven,
  classifyMenuItem,
} from "@/lib/services/reporting-service";

describe("reporting calculations", () => {
  it("calculates break-even revenue and margin of safety", () => {
    const result = calculateBreakEven({
      fixedCosts: 3000,
      revenue: 10000,
      variableCosts: 4000,
      unitsSold: 1000,
    });
    expect(result.contributionMarginRatio.toNumber()).toBe(0.6);
    expect(result.breakEvenRevenue?.toNumber()).toBe(5000);
    expect(result.breakEvenUnits?.toNumber()).toBe(500);
    expect(result.marginOfSafety.toNumber()).toBe(50);
  });

  it("classifies menu engineering quadrants", () => {
    expect(classifyMenuItem({
      quantitySold: 20,
      contributionPerUnit: 8,
      averageQuantitySold: 10,
      averageContributionPerUnit: 5,
    })).toBe(MenuEngineeringClass.STAR);
    expect(classifyMenuItem({
      quantitySold: 2,
      contributionPerUnit: 1,
      averageQuantitySold: 10,
      averageContributionPerUnit: 5,
    })).toBe(MenuEngineeringClass.DOG);
  });
});
