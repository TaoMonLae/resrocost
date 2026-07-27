import { Prisma } from "@prisma/client";

export function usableQuantity(
  purchaseQuantity: Prisma.Decimal.Value,
  wastePercentage: Prisma.Decimal.Value,
) {
  const quantity = new Prisma.Decimal(purchaseQuantity);
  const waste = new Prisma.Decimal(wastePercentage);
  if (quantity.lte(0)) throw new Error("Purchase quantity must be positive");
  if (waste.lt(0) || waste.gte(100)) {
    throw new Error("Waste percentage must be between 0 and 100");
  }
  return quantity.mul(new Prisma.Decimal(1).minus(waste.div(100)));
}

export function effectiveCostPerBaseUnit(
  purchasePrice: Prisma.Decimal.Value,
  convertedPurchaseQuantity: Prisma.Decimal.Value,
  wastePercentage: Prisma.Decimal.Value,
) {
  const price = new Prisma.Decimal(purchasePrice);
  if (price.lt(0)) throw new Error("Purchase price cannot be negative");
  return price.div(
    usableQuantity(convertedPurchaseQuantity, wastePercentage),
  );
}

export function ingredientCostUsed(
  costPerBaseUnit: Prisma.Decimal.Value,
  recipeBaseQuantity: Prisma.Decimal.Value,
) {
  const cost = new Prisma.Decimal(costPerBaseUnit);
  const quantity = new Prisma.Decimal(recipeBaseQuantity);
  if (cost.lt(0) || quantity.lte(0)) {
    throw new Error("Cost must be non-negative and quantity must be positive");
  }
  return cost.mul(quantity);
}
