"use server";

import { AuditAction, Unit } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { isSupportedCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";

export type OnboardingState = {
  error?: string;
};

const onboardingSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(isSupportedCurrency, "Select a supported currency"),
  country: z.string().length(2).transform((value) => value.toUpperCase()),
  timezone: z.string().min(2).max(80),
  taxRate: z.coerce.number().min(0).max(100),
  pricesIncludeTax: z.enum(["true", "false"]).transform((value) => value === "true"),
  defaultFoodCostPercent: z.coerce.number().gt(0).lt(100),
  defaultProfitMargin: z.coerce.number().gte(0).lt(100),
  monthlyFixedExpenses: z.coerce.number().min(0),
  branchName: z.string().trim().min(2).max(100),
  ingredientName: z.string().trim().max(120).optional(),
  ingredientUnit: z.nativeEnum(Unit).default(Unit.GRAM),
  ingredientStock: z.coerce.number().min(0).default(0),
  ingredientCost: z.coerce.number().min(0).default(0),
  recipeName: z.string().trim().max(120).optional(),
  recipeServings: z.coerce.number().gt(0).default(1),
  recipeIngredientQuantity: z.coerce.number().min(0).default(0),
  menuItemName: z.string().trim().max(120).optional(),
  menuItemPrice: z.coerce.number().min(0).default(0),
});

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${base || "restaurant"}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function completeOnboarding(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check your restaurant details and try again.",
    };
  }

  const existingMembership = await prisma.restaurantMember.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existingMembership) redirect("/dashboard");

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: data.restaurantName,
        slug: slugify(data.restaurantName),
        currency: data.currency,
        country: data.country,
        timezone: data.timezone,
        taxRate: data.taxRate,
        pricesIncludeTax: data.pricesIncludeTax,
        defaultFoodCostPercent: data.defaultFoodCostPercent,
        defaultProfitMargin: data.defaultProfitMargin,
        monthlyFixedExpenses: data.monthlyFixedExpenses,
        onboardingCompletedAt: new Date(),
      },
    });

    const branch = await tx.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: data.branchName,
        code: data.branchName
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 6)
          .toUpperCase() || "MAIN",
        timezone: data.timezone,
      },
    });

    await tx.restaurantMember.create({
      data: {
        restaurantId: restaurant.id,
        userId: session.user.id,
        role: "OWNER",
      },
    });

    let ingredient:
      | {
          id: string;
          currentCostPerBaseUnit: { toNumber(): number };
        }
      | undefined;

    if (data.ingredientName) {
      const category = await tx.ingredientCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: "Uncategorised",
        },
      });

      ingredient = await tx.ingredient.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: data.ingredientName,
          baseUnit: data.ingredientUnit,
          purchaseUnit: data.ingredientUnit,
          currentStock: data.ingredientStock,
          currentCostPerBaseUnit: data.ingredientCost,
        },
        select: { id: true, currentCostPerBaseUnit: true },
      });

      if (data.ingredientStock > 0) {
        await tx.inventoryTransaction.create({
          data: {
            restaurantId: restaurant.id,
            branchId: branch.id,
            ingredientId: ingredient.id,
            createdById: session.user.id,
            type: "OPENING_BALANCE",
            quantity: data.ingredientStock,
            unit: data.ingredientUnit,
            baseQuantity: data.ingredientStock,
            unitCost: data.ingredientCost,
            totalCost: data.ingredientStock * data.ingredientCost,
            notes: "Opening balance from onboarding",
          },
        });
      }
    }

    let recipe:
      | { id: string; currentCostPerServing: { toNumber(): number } }
      | undefined;

    if (data.recipeName) {
      const recipeCategory = await tx.recipeCategory.create({
        data: { restaurantId: restaurant.id, name: "Core recipes" },
      });
      const ingredientCost =
        ingredient && data.recipeIngredientQuantity > 0
          ? ingredient.currentCostPerBaseUnit.toNumber() *
            data.recipeIngredientQuantity
          : 0;

      recipe = await tx.recipe.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: recipeCategory.id,
          name: data.recipeName,
          batchYield: data.recipeServings,
          yieldUnit: Unit.UNIT,
          numberOfServings: data.recipeServings,
          currentBatchCost: ingredientCost,
          currentCostPerServing: ingredientCost / data.recipeServings,
        },
        select: { id: true, currentCostPerServing: true },
      });

      if (ingredient && data.recipeIngredientQuantity > 0) {
        await tx.recipeIngredient.create({
          data: {
            restaurantId: restaurant.id,
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            type: "INGREDIENT",
            quantity: data.recipeIngredientQuantity,
            unit: data.ingredientUnit,
            convertedBaseQuantity: data.recipeIngredientQuantity,
            costSnapshot:
              ingredient.currentCostPerBaseUnit.toNumber() *
              data.recipeIngredientQuantity,
          },
        });
      }
    }

    if (data.menuItemName) {
      const menuCategory = await tx.menuCategory.create({
        data: { restaurantId: restaurant.id, name: "Main menu" },
      });
      const foodCost = recipe?.currentCostPerServing.toNumber() ?? 0;
      const profit = data.menuItemPrice - foodCost;
      const margin =
        data.menuItemPrice > 0 ? (profit / data.menuItemPrice) * 100 : 0;

      const menuItem = await tx.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: menuCategory.id,
          recipeId: recipe?.id,
          name: data.menuItemName,
          currentBaseSellingPrice: data.menuItemPrice,
          targetFoodCostPercentage: data.defaultFoodCostPercent,
          targetProfitMargin: data.defaultProfitMargin,
          currentFoodCost: foodCost,
          currentFullCost: foodCost,
          currentProfit: profit,
          currentProfitMargin: margin,
          status: profit < 0 ? "LOSS" : "ACCEPTABLE",
        },
      });

      await tx.menuItemPriceHistory.create({
        data: {
          restaurantId: restaurant.id,
          menuItemId: menuItem.id,
          price: data.menuItemPrice,
          reason: "Initial onboarding price",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId: session.user.id,
        action: AuditAction.CREATE,
        entityType: "Restaurant",
        entityId: restaurant.id,
        newValues: {
          name: restaurant.name,
          branchName: branch.name,
          currency: restaurant.currency,
        },
      },
    });
  });

  redirect("/dashboard");
}
