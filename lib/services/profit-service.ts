import { Prisma } from "@prisma/client";

export function calculateMarginAndMarkup(input: {
  revenue: Prisma.Decimal.Value;
  cost: Prisma.Decimal.Value;
}) {
  const revenue = new Prisma.Decimal(input.revenue);
  const cost = new Prisma.Decimal(input.cost);
  const profit = revenue.minus(cost);
  return {
    profit,
    marginPercentage: revenue.gt(0)
      ? profit.div(revenue).mul(100)
      : new Prisma.Decimal(0),
    markupPercentage: cost.gt(0)
      ? profit.div(cost).mul(100)
      : new Prisma.Decimal(0),
  };
}

export type PriceRounding =
  | "NONE"
  | "NEAREST_005"
  | "NEAREST_010"
  | "NEAREST_050"
  | "NEAREST_WHOLE"
  | "ENDING_90"
  | "ENDING_99";

export function roundSuggestedPrice(
  value: Prisma.Decimal.Value,
  rule: PriceRounding,
) {
  const price = new Prisma.Decimal(value);
  if (price.lt(0)) throw new Error("Price cannot be negative");
  const increments: Partial<Record<PriceRounding, Prisma.Decimal>> = {
    NEAREST_005: new Prisma.Decimal("0.05"),
    NEAREST_010: new Prisma.Decimal("0.10"),
    NEAREST_050: new Prisma.Decimal("0.50"),
    NEAREST_WHOLE: new Prisma.Decimal(1),
  };
  const increment = increments[rule];
  if (increment) return price.div(increment).round().mul(increment);
  if (rule === "ENDING_90" || rule === "ENDING_99") {
    const ending = rule === "ENDING_90" ? new Prisma.Decimal("0.90") : new Prisma.Decimal("0.99");
    const floor = price.floor();
    const candidate = floor.plus(ending);
    return candidate.gte(price) ? candidate : floor.plus(1).plus(ending);
  }
  return price;
}
