import { Prisma } from "@prisma/client";
import { calculateChannelEconomics } from "@/lib/services/pricing-service";

export type RecipeConsumptionRow = {
  recipeId: string;
  ingredientId?: string | null;
  subRecipeId?: string | null;
  convertedBaseQuantity: Prisma.Decimal.Value;
};

export function expandRecipeConsumption(input: {
  recipeId: string;
  servingsSold: Prisma.Decimal.Value;
  recipeServings: ReadonlyMap<string, Prisma.Decimal.Value>;
  recipeYields: ReadonlyMap<string, Prisma.Decimal.Value>;
  componentsByRecipe: ReadonlyMap<string, readonly RecipeConsumptionRow[]>;
}) {
  const totals = new Map<string, Prisma.Decimal>();

  const expand = (recipeId: string, batchFraction: Prisma.Decimal, path: Set<string>) => {
    if (path.has(recipeId)) throw new Error("Circular recipe graph");
    const nextPath = new Set(path).add(recipeId);
    for (const component of input.componentsByRecipe.get(recipeId) ?? []) {
      const quantity = new Prisma.Decimal(
        component.convertedBaseQuantity,
      ).mul(batchFraction);
      if (component.ingredientId) {
        totals.set(
          component.ingredientId,
          (totals.get(component.ingredientId) ?? new Prisma.Decimal(0)).plus(quantity),
        );
      } else if (component.subRecipeId) {
        const subYield = new Prisma.Decimal(
          input.recipeYields.get(component.subRecipeId) ?? 0,
        );
        if (subYield.lte(0)) throw new Error("Sub-recipe yield must be positive");
        expand(component.subRecipeId, quantity.div(subYield), nextPath);
      }
    }
  };

  const servings = new Prisma.Decimal(input.recipeServings.get(input.recipeId) ?? 0);
  if (servings.lte(0)) throw new Error("Recipe servings must be positive");
  expand(input.recipeId, new Prisma.Decimal(input.servingsSold).div(servings), new Set());
  return totals;
}

export function calculateSaleLineSnapshot(input: {
  quantity: Prisma.Decimal.Value;
  sellingPrice: Prisma.Decimal.Value;
  foodCost: Prisma.Decimal.Value;
  fullCost: Prisma.Decimal.Value;
  discount?: Prisma.Decimal.Value;
  commissionPercentage?: Prisma.Decimal.Value;
  fixedTransactionFee?: Prisma.Decimal.Value;
  paymentProcessingPercentage?: Prisma.Decimal.Value;
  taxPercentage?: Prisma.Decimal.Value;
  packagingSurcharge?: Prisma.Decimal.Value;
  deliverySubsidy?: Prisma.Decimal.Value;
  discountContribution?: Prisma.Decimal.Value;
}) {
  const quantity = new Prisma.Decimal(input.quantity);
  const unitEconomics = calculateChannelEconomics({
    customerPrice: input.sellingPrice,
    fullCost: input.fullCost,
    commissionPercentage: input.commissionPercentage,
    fixedTransactionFee: input.fixedTransactionFee,
    paymentProcessingPercentage: input.paymentProcessingPercentage,
    taxPercentage: input.taxPercentage,
    packagingSurcharge: input.packagingSurcharge,
    deliverySubsidy: input.deliverySubsidy,
    discountContribution: input.discountContribution,
  });
  const grossSales = new Prisma.Decimal(input.sellingPrice).mul(quantity);
  const discount = new Prisma.Decimal(input.discount ?? 0);
  const netSales = grossSales.minus(discount);
  const foodCostSnapshot = new Prisma.Decimal(input.foodCost).mul(quantity);
  const fullCostSnapshot = new Prisma.Decimal(input.fullCost).mul(quantity);
  const channelFees = unitEconomics.channelFees.mul(quantity);
  const commission = new Prisma.Decimal(input.sellingPrice)
    .mul(input.commissionPercentage ?? 0)
    .div(100)
    .mul(quantity);
  const calculatedProfitSnapshot = netSales
    .plus(new Prisma.Decimal(input.packagingSurcharge ?? 0).mul(quantity))
    .minus(fullCostSnapshot)
    .minus(channelFees);
  const profitMarginSnapshot = netSales.gt(0)
    ? calculatedProfitSnapshot.div(netSales).mul(100)
    : new Prisma.Decimal(0);

  return {
    grossSales,
    netSales,
    foodCostSnapshot,
    fullCostSnapshot,
    channelCommissionSnapshot: commission,
    otherChannelFeesSnapshot: channelFees.minus(commission),
    calculatedProfitSnapshot,
    profitMarginSnapshot,
  };
}
