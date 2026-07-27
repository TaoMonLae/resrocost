"use server";

import {
  AuditAction,
  ExpenseType,
  InventoryTransactionType,
  Prisma,
  RecurrenceType,
  Unit,
  WasteReason,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextStockQuantity } from "@/lib/services/inventory-service";
import {
  calculateSaleLineSnapshot,
  expandRecipeConsumption,
} from "@/lib/services/sales-service";
import { convertQuantity } from "@/lib/services/unit-conversion-service";
import { requirePermission } from "@/lib/tenant";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);
const optionalRecurringDay = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().int().min(1).max(31).optional(),
);

const saleHeaderSchema = z.object({
  branchId: z.string().min(1),
  salesChannelId: z.string().min(1),
  soldAt: z.coerce.date(),
  orderReference: optionalText,
  customerCount: z.coerce.number().int().positive(),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  serviceCharge: z.coerce.number().min(0),
  paymentMethod: optionalText,
  notes: optionalText,
});

export async function createSaleAction(formData: FormData) {
  const membership = await requirePermission("sales:write");
  const header = saleHeaderSchema.parse(Object.fromEntries(formData));
  const itemIds = formData.getAll("menuItemId").map(String);
  const quantities = formData.getAll("quantity").map(Number);
  const rows = itemIds
    .map((menuItemId, index) => ({ menuItemId, quantity: quantities[index] }))
    .filter((row) => row.menuItemId);
  if (!rows.length) throw new Error("Add at least one sale item");
  if (new Set(rows.map((row) => row.menuItemId)).size !== rows.length) {
    throw new Error("Each menu item can only appear once per sale");
  }
  if (rows.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0)) {
    throw new Error("Sale quantities must be greater than zero");
  }

  const [branch, channel, menuItems, recipes, recipeComponents] =
    await Promise.all([
      prisma.branch.findFirst({
        where: {
          id: header.branchId,
          restaurantId: membership.restaurantId,
          active: true,
          deletedAt: null,
        },
      }),
      prisma.salesChannel.findFirst({
        where: {
          id: header.salesChannelId,
          restaurantId: membership.restaurantId,
          active: true,
          deletedAt: null,
        },
      }),
      prisma.menuItem.findMany({
        where: {
          id: { in: rows.map((row) => row.menuItemId) },
          restaurantId: membership.restaurantId,
          active: true,
          deletedAt: null,
        },
        include: {
          channelPrices: {
            where: { salesChannelId: header.salesChannelId, active: true },
          },
        },
      }),
      prisma.recipe.findMany({
        where: {
          restaurantId: membership.restaurantId,
          active: true,
          deletedAt: null,
        },
        select: { id: true, numberOfServings: true, batchYield: true },
      }),
      prisma.recipeIngredient.findMany({
        where: { restaurantId: membership.restaurantId },
        select: {
          recipeId: true,
          ingredientId: true,
          subRecipeId: true,
          convertedBaseQuantity: true,
        },
      }),
    ]);
  if (!branch || !channel || menuItems.length !== rows.length) {
    throw new Error("Sale contains unavailable restaurant records");
  }
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
  const recipeServings = new Map(
    recipes.map((recipe) => [recipe.id, recipe.numberOfServings]),
  );
  const recipeYields = new Map(
    recipes.map((recipe) => [recipe.id, recipe.batchYield]),
  );
  const componentsByRecipe = new Map<
    string,
    typeof recipeComponents
  >();
  for (const component of recipeComponents) {
    componentsByRecipe.set(component.recipeId, [
      ...(componentsByRecipe.get(component.recipeId) ?? []),
      component,
    ]);
  }

  const baseRows = rows.map((row) => {
    const item = menuItemById.get(row.menuItemId);
    if (!item) throw new Error("Menu item is unavailable");
    const price =
      item.channelPrices[0]?.customerPrice ?? item.currentBaseSellingPrice;
    return { row, item, price, gross: price.mul(row.quantity) };
  });
  const subtotal = baseRows.reduce(
    (sum, row) => sum.plus(row.gross),
    new Prisma.Decimal(0),
  );
  if (header.discount > subtotal.toNumber()) {
    throw new Error("Sale discount cannot exceed subtotal");
  }
  const snapshots = baseRows.map(({ row, item, price, gross }) => {
    const allocatedDiscount = subtotal.gt(0)
      ? new Prisma.Decimal(header.discount).mul(gross.div(subtotal))
      : new Prisma.Decimal(0);
    return {
      row,
      item,
      price,
      snapshot: calculateSaleLineSnapshot({
        quantity: row.quantity,
        sellingPrice: price,
        foodCost: item.currentFoodCost,
        fullCost: item.currentFullCost,
        discount: allocatedDiscount,
        ...channel,
      }),
    };
  });

  const requiredStock = new Map<string, Prisma.Decimal>();
  for (const { row, item } of snapshots) {
    if (!item.recipeId) continue;
    const usage = expandRecipeConsumption({
      recipeId: item.recipeId,
      servingsSold: new Prisma.Decimal(row.quantity).mul(item.servingMultiplier),
      recipeServings,
      recipeYields,
      componentsByRecipe,
    });
    for (const [ingredientId, quantity] of usage) {
      requiredStock.set(
        ingredientId,
        (requiredStock.get(ingredientId) ?? new Prisma.Decimal(0)).plus(quantity),
      );
    }
  }
  const stockIngredients = await prisma.ingredient.findMany({
    where: {
      id: { in: [...requiredStock.keys()] },
      restaurantId: membership.restaurantId,
      active: true,
      deletedAt: null,
    },
  });
  if (stockIngredients.length !== requiredStock.size) {
    throw new Error("A recipe ingredient is unavailable");
  }

  const totalCost = snapshots.reduce(
    (sum, row) =>
      sum.plus(row.snapshot.fullCostSnapshot)
        .plus(row.snapshot.channelCommissionSnapshot)
        .plus(row.snapshot.otherChannelFeesSnapshot),
    new Prisma.Decimal(0),
  );
  const totalProfit = snapshots.reduce(
    (sum, row) => sum.plus(row.snapshot.calculatedProfitSnapshot),
    new Prisma.Decimal(0),
  );
  const totalAmount = subtotal
    .minus(header.discount)
    .plus(header.tax)
    .plus(header.serviceCharge);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        salesChannelId: channel.id,
        soldAt: header.soldAt,
        orderReference: header.orderReference,
        customerCount: header.customerCount,
        subtotal,
        discount: header.discount,
        tax: header.tax,
        serviceCharge: header.serviceCharge,
        totalAmount,
        totalCost,
        totalProfit,
        paymentMethod: header.paymentMethod,
        notes: header.notes,
      },
    });
    for (const { row, item, price, snapshot } of snapshots) {
      await tx.saleItem.create({
        data: {
          restaurantId: membership.restaurantId,
          saleId: created.id,
          menuItemId: item.id,
          quantity: row.quantity,
          sellingPriceSnapshot: price,
          discount: snapshot.grossSales.minus(snapshot.netSales),
          netSales: snapshot.netSales,
          foodCostSnapshot: snapshot.foodCostSnapshot,
          fullCostSnapshot: snapshot.fullCostSnapshot,
          channelCommissionSnapshot: snapshot.channelCommissionSnapshot,
          otherChannelFeesSnapshot: snapshot.otherChannelFeesSnapshot,
          calculatedProfitSnapshot: snapshot.calculatedProfitSnapshot,
          profitMarginSnapshot: snapshot.profitMarginSnapshot,
        },
      });
    }
    for (const ingredient of stockIngredients) {
      const usage = requiredStock.get(ingredient.id) ?? new Prisma.Decimal(0);
      const nextQuantity = nextStockQuantity({
        currentQuantity: ingredient.currentStock,
        type: InventoryTransactionType.SALE_USAGE,
        baseQuantity: usage,
        allowNegative: membership.restaurant.allowNegativeStock,
      });
      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: nextQuantity },
      });
      await tx.inventoryTransaction.create({
        data: {
          restaurantId: membership.restaurantId,
          branchId: branch.id,
          ingredientId: ingredient.id,
          createdById: membership.userId,
          type: InventoryTransactionType.SALE_USAGE,
          quantity: usage.negated(),
          unit: ingredient.baseUnit,
          baseQuantity: usage.negated(),
          unitCost: ingredient.currentCostPerBaseUnit,
          totalCost: usage.mul(ingredient.currentCostPerBaseUnit).negated(),
          referenceType: "Sale",
          referenceId: created.id,
          notes: `Recipe usage for sale ${created.orderReference ?? created.id}`,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Sale",
        entityId: created.id,
        newValues: {
          totalAmount: created.totalAmount.toString(),
          totalProfit: created.totalProfit.toString(),
        },
      },
    });
    return created;
  });
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  redirect(`/sales/${sale.id}`);
}

const expenseSchema = z.object({
  branchId: z.string().min(1),
  categoryName: z.string().trim().min(2).max(80),
  supplierId: optionalText,
  payee: optionalText,
  expenseDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  tax: z.coerce.number().min(0),
  paymentMethod: optionalText,
  type: z.nativeEnum(ExpenseType),
  recurrence: z.nativeEnum(RecurrenceType),
  recurringDay: optionalRecurringDay,
  description: optionalText,
});

export async function createExpenseAction(formData: FormData) {
  const membership = await requirePermission("expenses:write");
  const data = expenseSchema.parse(Object.fromEntries(formData));
  const [branch, supplier] = await Promise.all([
    prisma.branch.findFirst({
      where: {
        id: data.branchId,
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
    }),
    data.supplierId
      ? prisma.supplier.findFirst({
          where: {
            id: data.supplierId,
            restaurantId: membership.restaurantId,
            deletedAt: null,
          },
        })
      : null,
  ]);
  if (!branch || (data.supplierId && !supplier)) {
    throw new Error("Expense contains unavailable restaurant records");
  }
  await prisma.$transaction(async (tx) => {
    const category = await tx.expenseCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: membership.restaurantId,
          name: data.categoryName,
        },
      },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.categoryName },
    });
    const expense = await tx.expense.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        categoryId: category.id,
        supplierId: supplier?.id,
        payee: data.payee,
        expenseDate: data.expenseDate,
        amount: data.amount,
        tax: data.tax,
        paymentMethod: data.paymentMethod,
        type: data.type,
        recurrence: data.recurrence,
        recurringDay:
          data.recurrence === RecurrenceType.RECURRING
            ? data.recurringDay
            : null,
        description: data.description,
      },
    });
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Expense",
        entityId: expense.id,
        newValues: { amount: expense.amount.toString(), type: expense.type },
      },
    });
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

const wasteSchema = z.object({
  branchId: z.string().min(1),
  sourceType: z.enum(["INGREDIENT", "RECIPE", "MENU_ITEM"]),
  sourceId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.nativeEnum(Unit),
  reason: z.nativeEnum(WasteReason),
  wasteDate: z.coerce.date(),
  notes: optionalText,
});

export async function createWasteAction(formData: FormData) {
  const membership = await requirePermission("waste:write");
  const data = wasteSchema.parse(Object.fromEntries(formData));
  const branch = await prisma.branch.findFirst({
    where: {
      id: data.branchId,
      restaurantId: membership.restaurantId,
      active: true,
      deletedAt: null,
    },
  });
  if (!branch) throw new Error("Branch is unavailable");

  const ingredient =
    data.sourceType === "INGREDIENT"
      ? await prisma.ingredient.findFirst({
          where: {
            id: data.sourceId,
            restaurantId: membership.restaurantId,
            active: true,
            deletedAt: null,
          },
        })
      : null;
  const recipe =
    data.sourceType === "RECIPE"
      ? await prisma.recipe.findFirst({
          where: {
            id: data.sourceId,
            restaurantId: membership.restaurantId,
            active: true,
            deletedAt: null,
          },
        })
      : null;
  const menuItem =
    data.sourceType === "MENU_ITEM"
      ? await prisma.menuItem.findFirst({
          where: {
            id: data.sourceId,
            restaurantId: membership.restaurantId,
            active: true,
            deletedAt: null,
          },
        })
      : null;
  if (!ingredient && !recipe && !menuItem) throw new Error("Waste source is unavailable");

  let convertedQuantity = new Prisma.Decimal(data.quantity);
  let cost = new Prisma.Decimal(0);
  if (ingredient) {
    convertedQuantity = convertQuantity(
      data.quantity,
      data.unit,
      ingredient.baseUnit,
      data.unit === ingredient.purchaseUnit
        ? ingredient.conversionFactor
        : undefined,
    );
    cost = convertedQuantity.mul(ingredient.currentCostPerBaseUnit);
  } else if (recipe) {
    convertedQuantity = convertQuantity(data.quantity, data.unit, recipe.yieldUnit);
    cost = convertedQuantity.div(recipe.batchYield).mul(recipe.currentBatchCost);
  } else if (menuItem) {
    if (data.unit !== Unit.UNIT && data.unit !== Unit.PIECE) {
      throw new Error("Menu item waste must use unit or piece");
    }
    cost = convertedQuantity.mul(menuItem.currentFullCost);
  }

  await prisma.$transaction(async (tx) => {
    const waste = await tx.wasteRecord.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        ingredientId: ingredient?.id,
        recipeId: recipe?.id,
        menuItemId: menuItem?.id,
        recordedById: membership.userId,
        quantity: data.quantity,
        unit: data.unit,
        cost,
        reason: data.reason,
        wasteDate: data.wasteDate,
        notes: data.notes,
      },
    });
    if (ingredient) {
      const nextQuantity = nextStockQuantity({
        currentQuantity: ingredient.currentStock,
        type: InventoryTransactionType.WASTE,
        baseQuantity: convertedQuantity,
        allowNegative: membership.restaurant.allowNegativeStock,
      });
      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: { currentStock: nextQuantity },
      });
      await tx.inventoryTransaction.create({
        data: {
          restaurantId: membership.restaurantId,
          branchId: branch.id,
          ingredientId: ingredient.id,
          createdById: membership.userId,
          type: InventoryTransactionType.WASTE,
          quantity: new Prisma.Decimal(data.quantity).negated(),
          unit: data.unit,
          baseQuantity: convertedQuantity.negated(),
          unitCost: ingredient.currentCostPerBaseUnit,
          totalCost: cost.negated(),
          referenceType: "WasteRecord",
          referenceId: waste.id,
          notes: data.notes ?? data.reason.replaceAll("_", " "),
        },
      });
    }
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "WasteRecord",
        entityId: waste.id,
        newValues: { cost: cost.toString(), reason: waste.reason },
      },
    });
  });
  revalidatePath("/waste");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
