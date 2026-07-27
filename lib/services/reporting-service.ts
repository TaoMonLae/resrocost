import { MenuEngineeringClass, Prisma } from "@prisma/client";

export function calculateBreakEven(input: {
  fixedCosts: Prisma.Decimal.Value;
  revenue: Prisma.Decimal.Value;
  variableCosts: Prisma.Decimal.Value;
  unitsSold?: Prisma.Decimal.Value;
}) {
  const fixedCosts = new Prisma.Decimal(input.fixedCosts);
  const revenue = new Prisma.Decimal(input.revenue);
  const variableCosts = new Prisma.Decimal(input.variableCosts);
  const contribution = revenue.minus(variableCosts);
  const contributionMarginRatio = revenue.gt(0)
    ? contribution.div(revenue)
    : new Prisma.Decimal(0);
  const breakEvenRevenue = contributionMarginRatio.gt(0)
    ? fixedCosts.div(contributionMarginRatio)
    : null;
  const units = new Prisma.Decimal(input.unitsSold ?? 0);
  const contributionPerUnit = units.gt(0)
    ? contribution.div(units)
    : new Prisma.Decimal(0);
  const breakEvenUnits = contributionPerUnit.gt(0)
    ? fixedCosts.div(contributionPerUnit).ceil()
    : null;
  const marginOfSafety = revenue.gt(0) && breakEvenRevenue
    ? revenue.minus(breakEvenRevenue).div(revenue).mul(100)
    : new Prisma.Decimal(0);

  return {
    contribution,
    contributionMarginRatio,
    contributionPerUnit,
    breakEvenRevenue,
    breakEvenUnits,
    marginOfSafety,
  };
}

export function classifyMenuItem(input: {
  quantitySold: Prisma.Decimal.Value;
  contributionPerUnit: Prisma.Decimal.Value;
  averageQuantitySold: Prisma.Decimal.Value;
  averageContributionPerUnit: Prisma.Decimal.Value;
}) {
  const popular = new Prisma.Decimal(input.quantitySold).gte(
    input.averageQuantitySold,
  );
  const profitable = new Prisma.Decimal(input.contributionPerUnit).gte(
    input.averageContributionPerUnit,
  );
  if (popular && profitable) return MenuEngineeringClass.STAR;
  if (popular) return MenuEngineeringClass.PLOWHORSE;
  if (profitable) return MenuEngineeringClass.PUZZLE;
  return MenuEngineeringClass.DOG;
}
