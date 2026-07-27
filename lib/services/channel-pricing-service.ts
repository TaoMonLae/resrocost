import { Prisma } from "@prisma/client";

export function requiredChannelPrice(input: {
  requiredNetRevenue: Prisma.Decimal.Value;
  commissionPercentage?: Prisma.Decimal.Value;
  paymentProcessingPercentage?: Prisma.Decimal.Value;
  taxPercentage?: Prisma.Decimal.Value;
  fixedTransactionFee?: Prisma.Decimal.Value;
  deliverySubsidy?: Prisma.Decimal.Value;
  discountContribution?: Prisma.Decimal.Value;
  packagingSurcharge?: Prisma.Decimal.Value;
}) {
  const percentageRate = new Prisma.Decimal(input.commissionPercentage ?? 0)
    .plus(input.paymentProcessingPercentage ?? 0)
    .plus(input.taxPercentage ?? 0)
    .div(100);
  if (percentageRate.gte(1)) {
    throw new Error("Combined channel percentage fees must be below 100%");
  }
  const fixedDeductions = new Prisma.Decimal(input.fixedTransactionFee ?? 0)
    .plus(input.deliverySubsidy ?? 0)
    .plus(input.discountContribution ?? 0)
    .minus(input.packagingSurcharge ?? 0);
  return new Prisma.Decimal(input.requiredNetRevenue)
    .plus(fixedDeductions)
    .div(new Prisma.Decimal(1).minus(percentageRate));
}
