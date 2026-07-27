import { MenuItemStatus, Prisma } from "@prisma/client";

export function calculateMenuEconomics(input: {
  recipeCostPerServing: Prisma.Decimal.Value;
  servingMultiplier?: Prisma.Decimal.Value;
  packagingCost?: Prisma.Decimal.Value;
  directLaborCost?: Prisma.Decimal.Value;
  utilityCost?: Prisma.Decimal.Value;
  otherVariableCost?: Prisma.Decimal.Value;
  overheadAllocation?: Prisma.Decimal.Value;
  sellingPrice: Prisma.Decimal.Value;
  targetFoodCostPercentage?: Prisma.Decimal.Value;
  targetProfitMargin?: Prisma.Decimal.Value;
}) {
  const servingMultiplier = new Prisma.Decimal(input.servingMultiplier ?? 1);
  const price = new Prisma.Decimal(input.sellingPrice);
  const targetFoodCost = new Prisma.Decimal(
    input.targetFoodCostPercentage ?? 30,
  );
  const targetMargin = new Prisma.Decimal(input.targetProfitMargin ?? 40);
  if (servingMultiplier.lte(0)) throw new Error("Serving multiplier must be positive");
  if (price.lt(0)) throw new Error("Selling price cannot be negative");
  if (targetFoodCost.lte(0) || targetFoodCost.gte(100)) {
    throw new Error("Target food cost must be between 0 and 100");
  }
  if (targetMargin.lt(0) || targetMargin.gte(100)) {
    throw new Error("Target margin must be between 0 and 100");
  }

  const currentFoodCost = new Prisma.Decimal(
    input.recipeCostPerServing,
  ).mul(servingMultiplier);
  const additionalCosts = [
    input.packagingCost,
    input.directLaborCost,
    input.utilityCost,
    input.otherVariableCost,
    input.overheadAllocation,
  ];
  let currentFullCost = currentFoodCost;
  for (const value of additionalCosts) {
    currentFullCost = currentFullCost.plus(value ?? 0);
  }
  const currentProfit = price.minus(currentFullCost);
  const currentProfitMargin = price.gt(0)
    ? currentProfit.div(price).mul(100)
    : new Prisma.Decimal(0);
  const suggestedPriceByFoodCost = currentFoodCost.div(
    targetFoodCost.div(100),
  );
  const suggestedPriceByMargin = currentFullCost.div(
    new Prisma.Decimal(1).minus(targetMargin.div(100)),
  );

  let status: MenuItemStatus = MenuItemStatus.LOW_MARGIN;
  if (currentProfit.lt(0)) status = MenuItemStatus.LOSS;
  else if (currentProfitMargin.gte(targetMargin)) status = MenuItemStatus.EXCELLENT;
  else if (currentProfitMargin.gte(targetMargin.mul(0.75))) {
    status = MenuItemStatus.ACCEPTABLE;
  }

  return {
    currentFoodCost,
    currentFullCost,
    currentProfit,
    currentProfitMargin,
    suggestedPriceByFoodCost,
    suggestedPriceByMargin,
    status,
  };
}

export function calculateChannelEconomics(input: {
  customerPrice: Prisma.Decimal.Value;
  fullCost: Prisma.Decimal.Value;
  commissionPercentage?: Prisma.Decimal.Value;
  fixedTransactionFee?: Prisma.Decimal.Value;
  paymentProcessingPercentage?: Prisma.Decimal.Value;
  taxPercentage?: Prisma.Decimal.Value;
  packagingSurcharge?: Prisma.Decimal.Value;
  deliverySubsidy?: Prisma.Decimal.Value;
  discountContribution?: Prisma.Decimal.Value;
}) {
  const customerPrice = new Prisma.Decimal(input.customerPrice);
  const percentageFees = new Prisma.Decimal(
    input.commissionPercentage ?? 0,
  )
    .plus(input.paymentProcessingPercentage ?? 0)
    .plus(input.taxPercentage ?? 0);
  const channelFees = customerPrice
    .mul(percentageFees)
    .div(100)
    .plus(input.fixedTransactionFee ?? 0)
    .plus(input.deliverySubsidy ?? 0)
    .plus(input.discountContribution ?? 0);
  const netRevenue = customerPrice
    .plus(input.packagingSurcharge ?? 0)
    .minus(channelFees);
  const profit = netRevenue.minus(input.fullCost);
  const margin = customerPrice.gt(0)
    ? profit.div(customerPrice).mul(100)
    : new Prisma.Decimal(0);

  return { channelFees, netRevenue, profit, margin };
}
