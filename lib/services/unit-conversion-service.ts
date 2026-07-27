import { Prisma, Unit } from "@prisma/client";

export type UnitDimension = "WEIGHT" | "VOLUME" | "COUNT";

const unitDefinitions: Record<
  Unit,
  { dimension: UnitDimension; factorToSmallest: Prisma.Decimal }
> = {
  MILLIGRAM: { dimension: "WEIGHT", factorToSmallest: new Prisma.Decimal(1) },
  GRAM: { dimension: "WEIGHT", factorToSmallest: new Prisma.Decimal(1_000) },
  KILOGRAM: {
    dimension: "WEIGHT",
    factorToSmallest: new Prisma.Decimal(1_000_000),
  },
  MILLILITER: {
    dimension: "VOLUME",
    factorToSmallest: new Prisma.Decimal(1),
  },
  LITER: {
    dimension: "VOLUME",
    factorToSmallest: new Prisma.Decimal(1_000),
  },
  UNIT: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
  PIECE: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
  DOZEN: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(12) },
  TRAY: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
  BOX: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
  BAG: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
  PACK: { dimension: "COUNT", factorToSmallest: new Prisma.Decimal(1) },
};
const standardCountPurchaseUnits = new Set<Unit>([
  Unit.UNIT,
  Unit.PIECE,
  Unit.DOZEN,
]);
const countBaseUnits = new Set<Unit>([Unit.UNIT, Unit.PIECE]);

export function getUnitDimension(unit: Unit) {
  return unitDefinitions[unit].dimension;
}

export function areUnitsCompatible(from: Unit, to: Unit) {
  return getUnitDimension(from) === getUnitDimension(to);
}

export function standardConversionFactor(from: Unit, to: Unit) {
  if (!areUnitsCompatible(from, to)) {
    throw new Error(`Cannot convert ${from} to incompatible unit ${to}`);
  }
  if (from === to) return new Prisma.Decimal(1);

  if (
    getUnitDimension(from) === "COUNT" &&
    !standardCountPurchaseUnits.has(from)
  ) {
    throw new Error(`${from} requires an ingredient-specific conversion factor`);
  }

  if (
    getUnitDimension(to) === "COUNT" &&
    !countBaseUnits.has(to)
  ) {
    throw new Error(`${to} cannot be used as a count base unit`);
  }

  return unitDefinitions[from].factorToSmallest.div(
    unitDefinitions[to].factorToSmallest,
  );
}

export function convertQuantity(
  quantity: Prisma.Decimal.Value,
  from: Unit,
  to: Unit,
  customFactor?: Prisma.Decimal.Value,
) {
  const value = new Prisma.Decimal(quantity);
  if (value.lte(0)) throw new Error("Quantity must be greater than zero");

  if (customFactor !== undefined) {
    const factor = new Prisma.Decimal(customFactor);
    if (factor.lte(0)) {
      throw new Error("Custom conversion factor must be greater than zero");
    }
    return value.mul(factor);
  }

  return value.mul(standardConversionFactor(from, to));
}

export function unitLabel(unit: Unit) {
  return unit.toLowerCase().replaceAll("_", " ");
}
