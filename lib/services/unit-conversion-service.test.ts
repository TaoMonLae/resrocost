import { describe, expect, it } from "vitest";
import { Unit } from "@prisma/client";
import {
  areUnitsCompatible,
  convertQuantity,
  standardConversionFactor,
} from "./unit-conversion-service";

describe("unit conversion", () => {
  it("converts kilograms to grams", () => {
    expect(convertQuantity(10, Unit.KILOGRAM, Unit.GRAM).toNumber()).toBe(10_000);
  });

  it("converts liters to milliliters", () => {
    expect(convertQuantity(2.5, Unit.LITER, Unit.MILLILITER).toNumber()).toBe(
      2_500,
    );
  });

  it("supports dozen to count", () => {
    expect(standardConversionFactor(Unit.DOZEN, Unit.PIECE).toNumber()).toBe(12);
  });

  it("uses custom package conversion", () => {
    expect(convertQuantity(3, Unit.BOX, Unit.PIECE, 24).toNumber()).toBe(72);
  });

  it("rejects incompatible dimensions", () => {
    expect(areUnitsCompatible(Unit.GRAM, Unit.LITER)).toBe(false);
    expect(() => convertQuantity(1, Unit.GRAM, Unit.LITER)).toThrow();
  });
});
