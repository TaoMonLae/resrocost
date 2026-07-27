"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { simulateMenuScenario } from "@/lib/services/scenario-service";
import { requirePermission } from "@/lib/tenant";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  menuItemId: z.string().min(1),
  ingredientPriceChangePercentage: z.coerce.number().min(-99).max(1000),
  portionSizeChangePercentage: z.coerce.number().min(-99).max(1000),
  sellingPriceChangePercentage: z.coerce.number().min(-99).max(1000),
  commissionPercentage: z.coerce.number().min(0).lt(100),
  wastePercentageChange: z.coerce.number().min(-99).max(1000),
  laborCostChange: z.coerce.number(),
  monthlySalesVolume: z.coerce.number().min(0),
  fixedExpenses: z.coerce.number().min(0),
});

export async function saveScenarioAction(formData: FormData) {
  const membership = await requirePermission("reports:read");
  const data = schema.parse(Object.fromEntries(formData));
  const item = await prisma.menuItem.findFirst({
    where: {
      id: data.menuItemId,
      restaurantId: membership.restaurantId,
      active: true,
      deletedAt: null,
    },
  });
  if (!item) throw new Error("Menu item is unavailable");
  const result = simulateMenuScenario({
    currentFoodCost: item.currentFoodCost,
    currentFullCost: item.currentFullCost,
    sellingPrice: item.currentBaseSellingPrice,
    ...data,
  });
  await prisma.scenario.upsert({
    where: {
      restaurantId_name: {
        restaurantId: membership.restaurantId,
        name: data.name,
      },
    },
    update: {
      description: data.description,
      input: { ...data, menuItemName: item.name },
      result: serializeResult(result),
    },
    create: {
      restaurantId: membership.restaurantId,
      name: data.name,
      description: data.description,
      input: { ...data, menuItemName: item.name },
      result: serializeResult(result),
    },
  });
  revalidatePath("/scenario-simulator");
}

function serializeResult(result: ReturnType<typeof simulateMenuScenario>) {
  return {
    adjustedFoodCost: result.adjustedFoodCost.toString(),
    adjustedFullCost: result.adjustedFullCost.toString(),
    adjustedPrice: result.adjustedPrice.toString(),
    commission: result.commission.toString(),
    profitPerSale: result.profitPerSale.toString(),
    profitMargin: result.profitMargin.toString(),
    monthlyProfit: result.monthlyProfit.toString(),
    breakEvenUnits: result.breakEvenUnits?.toString() ?? null,
  };
}
