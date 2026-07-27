import { AlertSeverity, AlertType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const generatedAlertTypes = [
  AlertType.LOW_STOCK,
  AlertType.LOW_MARGIN,
  AlertType.SELLING_AT_LOSS,
  AlertType.MISSING_INGREDIENT_PRICE,
] as const;

export async function refreshOperationalAlerts(restaurantId: string) {
  const [ingredients, menuItems] = await Promise.all([
    prisma.ingredient.findMany({
      where: { restaurantId, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        currentStock: true,
        minimumStock: true,
        currentCostPerBaseUnit: true,
      },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        currentProfitMargin: true,
        targetProfitMargin: true,
      },
    }),
  ]);
  const alerts = [
    ...ingredients
      .filter((item) => item.currentStock.lte(item.minimumStock))
      .map((item) => ({
        restaurantId,
        type: AlertType.LOW_STOCK,
        severity: AlertSeverity.WARNING,
        title: `${item.name} is low on stock`,
        description: `${item.currentStock.toFixed(2)} remains; reorder level is ${item.minimumStock.toFixed(2)}.`,
        relatedEntity: "Ingredient",
        relatedEntityId: item.id,
      })),
    ...ingredients
      .filter((item) => item.currentCostPerBaseUnit.lte(0))
      .map((item) => ({
        restaurantId,
        type: AlertType.MISSING_INGREDIENT_PRICE,
        severity: AlertSeverity.WARNING,
        title: `${item.name} has no cost`,
        description: "Recipe and menu profitability may be understated until a cost is recorded.",
        relatedEntity: "Ingredient",
        relatedEntityId: item.id,
      })),
    ...menuItems
      .filter((item) => item.status === "LOSS")
      .map((item) => ({
        restaurantId,
        type: AlertType.SELLING_AT_LOSS,
        severity: AlertSeverity.CRITICAL,
        title: `${item.name} is selling at a loss`,
        description: `Current margin is ${item.currentProfitMargin.toFixed(1)}%. Review price or costs immediately.`,
        relatedEntity: "MenuItem",
        relatedEntityId: item.id,
      })),
    ...menuItems
      .filter((item) => item.status === "LOW_MARGIN")
      .map((item) => ({
        restaurantId,
        type: AlertType.LOW_MARGIN,
        severity: AlertSeverity.WARNING,
        title: `${item.name} is below its margin target`,
        description: `Current margin is ${item.currentProfitMargin.toFixed(1)}%; target is ${item.targetProfitMargin.toFixed(1)}%.`,
        relatedEntity: "MenuItem",
        relatedEntityId: item.id,
      })),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.alert.deleteMany({
      where: {
        restaurantId,
        resolvedAt: null,
        type: { in: [...generatedAlertTypes] },
      },
    });
    if (alerts.length) await tx.alert.createMany({ data: alerts });
  });
  return alerts.length;
}
