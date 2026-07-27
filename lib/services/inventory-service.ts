import { InventoryTransactionType, Prisma } from "@prisma/client";

export function weightedAverageCost({
  currentQuantity,
  currentUnitCost,
  incomingQuantity,
  incomingUnitCost,
}: {
  currentQuantity: Prisma.Decimal.Value;
  currentUnitCost: Prisma.Decimal.Value;
  incomingQuantity: Prisma.Decimal.Value;
  incomingUnitCost: Prisma.Decimal.Value;
}) {
  const currentQty = new Prisma.Decimal(currentQuantity);
  const currentCost = new Prisma.Decimal(currentUnitCost);
  const incomingQty = new Prisma.Decimal(incomingQuantity);
  const incomingCost = new Prisma.Decimal(incomingUnitCost);
  const newQuantity = currentQty.plus(incomingQty);

  if (currentQty.lt(0) || incomingQty.lte(0)) {
    throw new Error("Stock quantities cannot be negative");
  }
  if (currentCost.lt(0) || incomingCost.lt(0)) {
    throw new Error("Unit costs cannot be negative");
  }

  if (newQuantity.isZero()) return new Prisma.Decimal(0);
  return currentQty
    .mul(currentCost)
    .plus(incomingQty.mul(incomingCost))
    .div(newQuantity);
}

const outflowTypes = new Set<InventoryTransactionType>([
  InventoryTransactionType.RECIPE_USAGE,
  InventoryTransactionType.SALE_USAGE,
  InventoryTransactionType.WASTE,
  InventoryTransactionType.ADJUSTMENT_OUT,
  InventoryTransactionType.TRANSFER_OUT,
  InventoryTransactionType.RETURN_TO_SUPPLIER,
]);

export function signedBaseQuantity(
  type: InventoryTransactionType,
  baseQuantity: Prisma.Decimal.Value,
) {
  const quantity = new Prisma.Decimal(baseQuantity);
  if (quantity.lte(0)) throw new Error("Transaction quantity must be positive");
  return outflowTypes.has(type) ? quantity.negated() : quantity;
}

export function nextStockQuantity({
  currentQuantity,
  type,
  baseQuantity,
  allowNegative,
}: {
  currentQuantity: Prisma.Decimal.Value;
  type: InventoryTransactionType;
  baseQuantity: Prisma.Decimal.Value;
  allowNegative: boolean;
}) {
  const next = new Prisma.Decimal(currentQuantity).plus(
    signedBaseQuantity(type, baseQuantity),
  );
  if (!allowNegative && next.lt(0)) {
    throw new Error("This adjustment would make stock negative");
  }
  return next;
}
