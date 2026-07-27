"use server";

import {
  AuditAction,
  ChannelType,
  RecipeIngredientType,
  Unit,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertNoRecipeCycle,
  calculateRecipeCost,
} from "@/lib/services/recipe-cost-service";
import { calculateMenuEconomics } from "@/lib/services/pricing-service";
import { convertQuantity } from "@/lib/services/unit-conversion-service";
import { requirePermission } from "@/lib/tenant";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

const recipeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryName: z.string().trim().min(2).max(80),
  description: optionalText,
  preparationInstructions: optionalText,
  batchYield: z.coerce.number().positive(),
  yieldUnit: z.nativeEnum(Unit),
  numberOfServings: z.coerce.number().positive(),
  preparationTimeMinutes: z.coerce.number().int().min(0).optional(),
  cookingTimeMinutes: z.coerce.number().int().min(0).optional(),
  wastePercentage: z.coerce.number().min(0).lt(100),
});

export async function createRecipeAction(formData: FormData) {
  const membership = await requirePermission("recipes:write");
  const data = recipeSchema.parse(Object.fromEntries(formData));
  const componentTypes = formData.getAll("componentType").map(String);
  const componentIds = formData.getAll("componentId").map(String);
  const quantities = formData.getAll("componentQuantity").map(Number);
  const units = formData.getAll("componentUnit").map(String);
  const notes = formData.getAll("preparationNote").map(String);
  const rows = componentIds
    .map((componentId, index) => ({
      componentId,
      type: componentTypes[index] as RecipeIngredientType,
      quantity: quantities[index],
      unit: units[index] as Unit,
      preparationNote: notes[index] || undefined,
    }))
    .filter((row) => row.componentId);

  if (!rows.length) throw new Error("Add at least one recipe component");
  for (const row of rows) {
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
      throw new Error("Recipe quantities must be greater than zero");
    }
    if (!Object.values(Unit).includes(row.unit)) throw new Error("Invalid unit");
    if (!Object.values(RecipeIngredientType).includes(row.type)) {
      throw new Error("Invalid component type");
    }
  }

  const ingredientIds = rows
    .filter((row) => row.type !== RecipeIngredientType.SUB_RECIPE)
    .map((row) => row.componentId);
  const subRecipeIds = rows
    .filter((row) => row.type === RecipeIngredientType.SUB_RECIPE)
    .map((row) => row.componentId);
  const [ingredients, subRecipes, recipeEdges] = await Promise.all([
    prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
    }),
    prisma.recipe.findMany({
      where: {
        id: { in: subRecipeIds },
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
    }),
    prisma.recipeIngredient.findMany({
      where: {
        restaurantId: membership.restaurantId,
        subRecipeId: { not: null },
      },
      select: { recipeId: true, subRecipeId: true },
    }),
  ]);
  if (
    ingredients.length !== new Set(ingredientIds).size ||
    subRecipes.length !== new Set(subRecipeIds).size
  ) {
    throw new Error("Recipe contains an unavailable component");
  }

  const edges = new Map<string, string[]>();
  for (const edge of recipeEdges) {
    if (!edge.subRecipeId) continue;
    edges.set(edge.recipeId, [...(edges.get(edge.recipeId) ?? []), edge.subRecipeId]);
  }
  // New IDs cannot be referenced yet, but this also validates the selected graph.
  for (const subRecipeId of subRecipeIds) {
    assertNoRecipeCycle("__new_recipe__", [subRecipeId], edges);
  }

  const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
  const subRecipeById = new Map(subRecipes.map((item) => [item.id, item]));
  const calculatedRows = rows.map((row, sortOrder) => {
    if (row.type === RecipeIngredientType.SUB_RECIPE) {
      const subRecipe = subRecipeById.get(row.componentId);
      if (!subRecipe) throw new Error("Sub-recipe is unavailable");
      const convertedBaseQuantity = convertQuantity(
        row.quantity,
        row.unit,
        subRecipe.yieldUnit,
      );
      return {
        ...row,
        sortOrder,
        ingredientId: undefined,
        subRecipeId: subRecipe.id,
        convertedBaseQuantity,
        costPerBaseUnit: subRecipe.currentBatchCost.div(subRecipe.batchYield),
      };
    }

    const ingredient = ingredientById.get(row.componentId);
    if (!ingredient) throw new Error("Ingredient is unavailable");
    const customFactor =
      row.unit === ingredient.purchaseUnit
        ? ingredient.conversionFactor
        : undefined;
    const convertedBaseQuantity = convertQuantity(
      row.quantity,
      row.unit,
      ingredient.baseUnit,
      customFactor,
    );
    return {
      ...row,
      sortOrder,
      ingredientId: ingredient.id,
      subRecipeId: undefined,
      convertedBaseQuantity,
      costPerBaseUnit: ingredient.currentCostPerBaseUnit,
    };
  });
  const costs = calculateRecipeCost({
    components: calculatedRows,
    wastePercentage: data.wastePercentage,
    numberOfServings: data.numberOfServings,
  });

  const recipe = await prisma.$transaction(async (tx) => {
    const category = await tx.recipeCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: membership.restaurantId,
          name: data.categoryName,
        },
      },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.categoryName },
    });
    const created = await tx.recipe.create({
      data: {
        restaurantId: membership.restaurantId,
        categoryId: category.id,
        name: data.name,
        description: data.description,
        preparationInstructions: data.preparationInstructions,
        batchYield: data.batchYield,
        yieldUnit: data.yieldUnit,
        numberOfServings: data.numberOfServings,
        wastePercentage: data.wastePercentage,
        preparationTimeMinutes: data.preparationTimeMinutes || null,
        cookingTimeMinutes: data.cookingTimeMinutes || null,
        directBatchCost: costs.directBatchCost,
        currentBatchCost: costs.currentBatchCost,
        currentCostPerServing: costs.currentCostPerServing,
      },
    });
    await tx.recipeIngredient.createMany({
      data: calculatedRows.map((row) => ({
        restaurantId: membership.restaurantId,
        recipeId: created.id,
        ingredientId: row.ingredientId,
        subRecipeId: row.subRecipeId,
        type: row.type,
        quantity: row.quantity,
        unit: row.unit,
        convertedBaseQuantity: row.convertedBaseQuantity,
        costSnapshot: row.convertedBaseQuantity.mul(row.costPerBaseUnit),
        preparationNote: row.preparationNote,
        sortOrder: row.sortOrder,
      })),
    });
    await tx.recipeVersion.create({
      data: {
        restaurantId: membership.restaurantId,
        recipeId: created.id,
        version: 1,
        snapshot: {
          name: created.name,
          batchYield: created.batchYield.toString(),
          numberOfServings: created.numberOfServings.toString(),
          components: calculatedRows.map((row) => ({
            componentId: row.componentId,
            type: row.type,
            quantity: row.quantity,
            unit: row.unit,
            cost: row.convertedBaseQuantity.mul(row.costPerBaseUnit).toString(),
          })),
        },
        changeNote: "Initial recipe",
      },
    });
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Recipe",
        entityId: created.id,
        newValues: { name: created.name, version: 1 },
      },
    });
    return created;
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

const menuItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: optionalText,
  categoryName: z.string().trim().min(2).max(80),
  recipeId: optionalText,
  description: optionalText,
  servingMultiplier: z.coerce.number().positive(),
  currentBaseSellingPrice: z.coerce.number().min(0),
  targetFoodCostPercentage: z.coerce.number().positive().lt(100),
  targetProfitMargin: z.coerce.number().min(0).lt(100),
  packagingCost: z.coerce.number().min(0),
  directLaborCost: z.coerce.number().min(0),
  utilityCost: z.coerce.number().min(0),
  otherVariableCost: z.coerce.number().min(0),
  overheadAllocation: z.coerce.number().min(0),
});

export async function createMenuItemAction(formData: FormData) {
  const membership = await requirePermission("menu:write");
  const data = menuItemSchema.parse(Object.fromEntries(formData));
  const recipe = data.recipeId
    ? await prisma.recipe.findFirst({
        where: {
          id: data.recipeId,
          restaurantId: membership.restaurantId,
          active: true,
          deletedAt: null,
        },
      })
    : null;
  if (data.recipeId && !recipe) throw new Error("Recipe is unavailable");
  const economics = calculateMenuEconomics({
    recipeCostPerServing: recipe?.currentCostPerServing ?? 0,
    ...data,
    sellingPrice: data.currentBaseSellingPrice,
  });

  const menuItem = await prisma.$transaction(async (tx) => {
    const category = await tx.menuCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: membership.restaurantId,
          name: data.categoryName,
        },
      },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.categoryName },
    });
    const created = await tx.menuItem.create({
      data: {
        restaurantId: membership.restaurantId,
        categoryId: category.id,
        recipeId: data.recipeId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        servingMultiplier: data.servingMultiplier,
        currentBaseSellingPrice: data.currentBaseSellingPrice,
        targetFoodCostPercentage: data.targetFoodCostPercentage,
        targetProfitMargin: data.targetProfitMargin,
        packagingCost: data.packagingCost,
        directLaborCost: data.directLaborCost,
        utilityCost: data.utilityCost,
        otherVariableCost: data.otherVariableCost,
        overheadAllocation: data.overheadAllocation,
        currentFoodCost: economics.currentFoodCost,
        currentFullCost: economics.currentFullCost,
        currentProfit: economics.currentProfit,
        currentProfitMargin: economics.currentProfitMargin,
        status: economics.status,
      },
    });
    await tx.menuItemPriceHistory.create({
      data: {
        restaurantId: membership.restaurantId,
        menuItemId: created.id,
        price: created.currentBaseSellingPrice,
        reason: "Initial price",
      },
    });
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "MenuItem",
        entityId: created.id,
        newValues: { name: created.name, price: created.currentBaseSellingPrice.toString() },
      },
    });
    return created;
  });

  revalidatePath("/menu-items");
  revalidatePath("/pricing");
  redirect(`/menu-items/${menuItem.id}`);
}

const priceSchema = z.object({
  menuItemId: z.string().min(1),
  price: z.coerce.number().min(0),
  reason: optionalText,
});

export async function updateMenuPriceAction(formData: FormData) {
  const membership = await requirePermission("menu:write");
  const data = priceSchema.parse(Object.fromEntries(formData));
  const item = await prisma.menuItem.findFirst({
    where: {
      id: data.menuItemId,
      restaurantId: membership.restaurantId,
      deletedAt: null,
    },
    include: { recipe: true },
  });
  if (!item) throw new Error("Menu item is unavailable");
  const economics = calculateMenuEconomics({
    recipeCostPerServing: item.recipe?.currentCostPerServing ?? 0,
    servingMultiplier: item.servingMultiplier,
    packagingCost: item.packagingCost,
    directLaborCost: item.directLaborCost,
    utilityCost: item.utilityCost,
    otherVariableCost: item.otherVariableCost,
    overheadAllocation: item.overheadAllocation,
    sellingPrice: data.price,
    targetFoodCostPercentage: item.targetFoodCostPercentage,
    targetProfitMargin: item.targetProfitMargin,
  });
  await prisma.$transaction([
    prisma.menuItem.update({
      where: { id: item.id },
      data: {
        currentBaseSellingPrice: data.price,
        currentProfit: economics.currentProfit,
        currentProfitMargin: economics.currentProfitMargin,
        status: economics.status,
      },
    }),
    prisma.menuItemPriceHistory.create({
      data: {
        restaurantId: membership.restaurantId,
        menuItemId: item.id,
        price: data.price,
        reason: data.reason,
      },
    }),
    prisma.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.PRICE_CHANGE,
        entityType: "MenuItem",
        entityId: item.id,
        oldValues: { price: item.currentBaseSellingPrice.toString() },
        newValues: { price: String(data.price) },
      },
    }),
  ]);
  revalidatePath("/pricing");
  revalidatePath(`/menu-items/${item.id}`);
}

const channelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.nativeEnum(ChannelType),
  commissionPercentage: z.coerce.number().min(0).max(100),
  fixedTransactionFee: z.coerce.number().min(0),
  paymentProcessingPercentage: z.coerce.number().min(0).max(100),
  taxPercentage: z.coerce.number().min(0).max(100),
  packagingSurcharge: z.coerce.number().min(0),
  deliverySubsidy: z.coerce.number().min(0),
  discountContribution: z.coerce.number().min(0),
});

export async function createSalesChannelAction(formData: FormData) {
  const membership = await requirePermission("menu:write");
  const data = channelSchema.parse(Object.fromEntries(formData));
  await prisma.salesChannel.create({
    data: { restaurantId: membership.restaurantId, ...data },
  });
  revalidatePath("/sales-channels");
  revalidatePath("/pricing");
}

const channelPriceSchema = z.object({
  menuItemId: z.string().min(1),
  salesChannelId: z.string().min(1),
  customerPrice: z.coerce.number().min(0),
});

export async function upsertChannelPriceAction(formData: FormData) {
  const membership = await requirePermission("menu:write");
  const data = channelPriceSchema.parse(Object.fromEntries(formData));
  const [item, channel] = await Promise.all([
    prisma.menuItem.findFirst({
      where: {
        id: data.menuItemId,
        restaurantId: membership.restaurantId,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.salesChannel.findFirst({
      where: {
        id: data.salesChannelId,
        restaurantId: membership.restaurantId,
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!item || !channel) throw new Error("Pricing record is unavailable");
  await prisma.menuItemChannelPrice.upsert({
    where: {
      menuItemId_salesChannelId: {
        menuItemId: item.id,
        salesChannelId: channel.id,
      },
    },
    update: { customerPrice: data.customerPrice, active: true },
    create: {
      restaurantId: membership.restaurantId,
      menuItemId: item.id,
      salesChannelId: channel.id,
      customerPrice: data.customerPrice,
    },
  });
  revalidatePath("/pricing");
  revalidatePath(`/menu-items/${item.id}`);
}
