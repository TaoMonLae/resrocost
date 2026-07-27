import { Prisma } from "@prisma/client";

export type RecipeCostComponent = {
  convertedBaseQuantity: Prisma.Decimal.Value;
  costPerBaseUnit: Prisma.Decimal.Value;
};

export function calculateRecipeCost(input: {
  components: RecipeCostComponent[];
  wastePercentage?: Prisma.Decimal.Value;
  numberOfServings: Prisma.Decimal.Value;
}) {
  const servings = new Prisma.Decimal(input.numberOfServings);
  const waste = new Prisma.Decimal(input.wastePercentage ?? 0);
  if (servings.lte(0)) throw new Error("Number of servings must be positive");
  if (waste.lt(0) || waste.gte(100)) {
    throw new Error("Recipe waste percentage must be between 0 and 100");
  }

  const directBatchCost = input.components.reduce(
    (sum, component) =>
      sum.plus(
        new Prisma.Decimal(component.convertedBaseQuantity).mul(
          component.costPerBaseUnit,
        ),
      ),
    new Prisma.Decimal(0),
  );
  const currentBatchCost = directBatchCost.div(
    new Prisma.Decimal(1).minus(waste.div(100)),
  );

  return {
    directBatchCost,
    currentBatchCost,
    currentCostPerServing: currentBatchCost.div(servings),
  };
}

export function assertNoRecipeCycle(
  recipeId: string,
  proposedSubRecipeIds: string[],
  existingEdges: ReadonlyMap<string, readonly string[]>,
) {
  const visit = (currentId: string, path: Set<string>) => {
    if (currentId === recipeId) throw new Error("Circular sub-recipe detected");
    if (path.has(currentId)) return;
    const nextPath = new Set(path).add(currentId);
    for (const child of existingEdges.get(currentId) ?? []) {
      visit(child, nextPath);
    }
  };

  for (const subRecipeId of proposedSubRecipeIds) {
    visit(subRecipeId, new Set());
  }
}
