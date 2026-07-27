import { Prisma } from "@prisma/client";
import { calculateBreakEven } from "@/lib/services/reporting-service";

export function simulateMenuScenario(input: {
  currentFoodCost: Prisma.Decimal.Value;
  currentFullCost: Prisma.Decimal.Value;
  sellingPrice: Prisma.Decimal.Value;
  ingredientPriceChangePercentage?: Prisma.Decimal.Value;
  portionSizeChangePercentage?: Prisma.Decimal.Value;
  sellingPriceChangePercentage?: Prisma.Decimal.Value;
  commissionPercentage?: Prisma.Decimal.Value;
  wastePercentageChange?: Prisma.Decimal.Value;
  laborCostChange?: Prisma.Decimal.Value;
  monthlySalesVolume: Prisma.Decimal.Value;
  fixedExpenses: Prisma.Decimal.Value;
}) {
  const percentMultiplier = (value: Prisma.Decimal.Value) =>
    new Prisma.Decimal(1).plus(new Prisma.Decimal(value).div(100));
  const baseFoodCost = new Prisma.Decimal(input.currentFoodCost);
  const baseFullCost = new Prisma.Decimal(input.currentFullCost);
  const basePrice = new Prisma.Decimal(input.sellingPrice);
  const adjustedFoodCost = baseFoodCost
    .mul(percentMultiplier(input.ingredientPriceChangePercentage ?? 0))
    .mul(percentMultiplier(input.portionSizeChangePercentage ?? 0))
    .mul(percentMultiplier(input.wastePercentageChange ?? 0));
  const nonFoodCost = Prisma.Decimal.max(
    baseFullCost.minus(baseFoodCost),
    new Prisma.Decimal(0),
  ).plus(input.laborCostChange ?? 0);
  const adjustedFullCost = adjustedFoodCost.plus(nonFoodCost);
  const adjustedPrice = basePrice.mul(
    percentMultiplier(input.sellingPriceChangePercentage ?? 0),
  );
  const commission = adjustedPrice
    .mul(input.commissionPercentage ?? 0)
    .div(100);
  const profitPerSale = adjustedPrice.minus(adjustedFullCost).minus(commission);
  const profitMargin = adjustedPrice.gt(0)
    ? profitPerSale.div(adjustedPrice).mul(100)
    : new Prisma.Decimal(0);
  const volume = new Prisma.Decimal(input.monthlySalesVolume);
  const monthlyProfit = profitPerSale
    .mul(volume)
    .minus(input.fixedExpenses);
  const breakEven = calculateBreakEven({
    fixedCosts: input.fixedExpenses,
    revenue: adjustedPrice.mul(volume),
    variableCosts: adjustedFullCost.plus(commission).mul(volume),
    unitsSold: volume,
  });

  return {
    adjustedFoodCost,
    adjustedFullCost,
    adjustedPrice,
    commission,
    profitPerSale,
    profitMargin,
    monthlyProfit,
    breakEvenUnits: breakEven.breakEvenUnits,
  };
}
