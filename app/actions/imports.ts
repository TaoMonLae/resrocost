"use server";

import {
  AuditAction,
  ExpenseType,
  InventoryTransactionType,
  PaymentStatus,
  Prisma,
  RecurrenceType,
  Unit,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { effectiveCostPerBaseUnit } from "@/lib/services/ingredient-cost-service";
import { nextStockQuantity, weightedAverageCost } from "@/lib/services/inventory-service";
import { calculateMenuEconomics } from "@/lib/services/pricing-service";
import { calculateSaleLineSnapshot, expandRecipeConsumption } from "@/lib/services/sales-service";
import { convertQuantity } from "@/lib/services/unit-conversion-service";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export type ImportState = {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
  message?: string;
};

export const initialImportState: ImportState = { imported: 0, failed: 0, errors: [] };

const rowRecord = z.record(z.string(), z.string());

export async function importCsvRowsAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const membership = await requirePermission("reports:export");
  const type = String(formData.get("type") ?? "");
  const rawRows = JSON.parse(String(formData.get("rows") ?? "[]")) as unknown;
  const rows = z.array(rowRecord).min(1).max(5000).parse(rawRows);
  const result: ImportState = { imported: 0, failed: 0, errors: [] };

  for (let index = 0; index < rows.length; index += 1) {
    try {
      if (type === "ingredients") await importIngredient(rows[index], membership);
      else if (type === "suppliers") await importSupplier(rows[index], membership);
      else if (type === "menu-items") await importMenuItem(rows[index], membership);
      else if (type === "expenses") await importExpense(rows[index], membership);
      else if (type === "purchases") await importPurchase(rows[index], membership);
      else if (type === "sales") await importSale(rows[index], membership);
      else throw new Error("Unknown import type");
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : "Import failed",
      });
    }
  }
  result.message = `Imported ${result.imported} of ${rows.length} rows.`;
  for (const path of ["/ingredients", "/suppliers", "/purchases", "/menu-items", "/sales", "/expenses", "/inventory", "/dashboard"]) {
    revalidatePath(path);
  }
  return result;
}

type Membership = Awaited<ReturnType<typeof requirePermission>>;

const ingredientRow = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().optional(),
  category: z.string().trim().min(2),
  baseUnit: z.nativeEnum(Unit),
  purchaseUnit: z.nativeEnum(Unit),
  conversionFactor: z.coerce.number().positive(),
  currentStock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
  unitCost: z.coerce.number().min(0),
  wastePercentage: z.coerce.number().min(0).lt(100),
});

async function importIngredient(row: Record<string, string>, membership: Membership) {
  const data = ingredientRow.parse(row);
  await prisma.$transaction(async (tx) => {
    const category = await tx.ingredientCategory.upsert({
      where: { restaurantId_name: { restaurantId: membership.restaurantId, name: data.category } },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.category },
    });
    const existing = await tx.ingredient.findFirst({
      where: {
        restaurantId: membership.restaurantId,
        OR: [
          ...(data.sku ? [{ sku: data.sku }] : []),
          { name: { equals: data.name, mode: "insensitive" } },
        ],
        deletedAt: null,
      },
    });
    if (existing) {
      await tx.ingredient.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          sku: data.sku || null,
          categoryId: category.id,
          baseUnit: data.baseUnit,
          purchaseUnit: data.purchaseUnit,
          conversionFactor: data.conversionFactor,
          minimumStock: data.minimumStock,
          currentCostPerBaseUnit: data.unitCost,
          wastePercentage: data.wastePercentage,
          usableYieldPercentage: 100 - data.wastePercentage,
        },
      });
      return;
    }
    const ingredient = await tx.ingredient.create({
      data: {
        restaurantId: membership.restaurantId,
        categoryId: category.id,
        name: data.name,
        sku: data.sku || null,
        baseUnit: data.baseUnit,
        purchaseUnit: data.purchaseUnit,
        conversionFactor: data.conversionFactor,
        currentStock: data.currentStock,
        minimumStock: data.minimumStock,
        currentCostPerBaseUnit: data.unitCost,
        wastePercentage: data.wastePercentage,
        usableYieldPercentage: 100 - data.wastePercentage,
      },
    });
    const branch = await tx.branch.findFirst({
      where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (branch && data.currentStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          restaurantId: membership.restaurantId,
          branchId: branch.id,
          ingredientId: ingredient.id,
          createdById: membership.userId,
          type: InventoryTransactionType.OPENING_BALANCE,
          quantity: data.currentStock,
          unit: data.baseUnit,
          baseQuantity: data.currentStock,
          unitCost: data.unitCost,
          totalCost: new Prisma.Decimal(data.currentStock).mul(data.unitCost),
          referenceType: "CSVImport",
          notes: "Opening stock imported from CSV",
        },
      });
    }
  });
}

const supplierRow = z.object({
  name: z.string().trim().min(2),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  address: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
});

async function importSupplier(row: Record<string, string>, membership: Membership) {
  const data = supplierRow.parse(row);
  await prisma.supplier.upsert({
    where: { restaurantId_name: { restaurantId: membership.restaurantId, name: data.name } },
    update: { ...data, deletedAt: null },
    create: { restaurantId: membership.restaurantId, ...data },
  });
}

const menuItemRow = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().optional(),
  category: z.string().trim().min(2),
  recipe: z.string().trim().optional(),
  sellingPrice: z.coerce.number().min(0),
  targetFoodCostPercentage: z.coerce.number().positive().lt(100),
  targetProfitMargin: z.coerce.number().min(0).lt(100),
  packagingCost: z.coerce.number().min(0),
  directLaborCost: z.coerce.number().min(0),
  utilityCost: z.coerce.number().min(0),
  otherVariableCost: z.coerce.number().min(0),
  overheadAllocation: z.coerce.number().min(0),
});

async function importMenuItem(row: Record<string, string>, membership: Membership) {
  const data = menuItemRow.parse(row);
  const recipe = data.recipe
    ? await prisma.recipe.findFirst({ where: { restaurantId: membership.restaurantId, name: { equals: data.recipe, mode: "insensitive" }, active: true, deletedAt: null } })
    : null;
  if (data.recipe && !recipe) throw new Error(`Recipe "${data.recipe}" was not found`);
  const economics = calculateMenuEconomics({
    ...data,
    recipeCostPerServing: recipe?.currentCostPerServing ?? 0,
  });
  await prisma.$transaction(async (tx) => {
    const category = await tx.menuCategory.upsert({
      where: { restaurantId_name: { restaurantId: membership.restaurantId, name: data.category } },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.category },
    });
    const existing = await tx.menuItem.findFirst({
      where: {
        restaurantId: membership.restaurantId,
        OR: [...(data.sku ? [{ sku: data.sku }] : []), { name: { equals: data.name, mode: "insensitive" } }],
        deletedAt: null,
      },
    });
    const values = {
      categoryId: category.id,
      recipeId: recipe?.id,
      name: data.name,
      sku: data.sku || null,
      currentBaseSellingPrice: data.sellingPrice,
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
    };
    const item = existing
      ? await tx.menuItem.update({ where: { id: existing.id }, data: values })
      : await tx.menuItem.create({ data: { restaurantId: membership.restaurantId, ...values } });
    await tx.menuItemPriceHistory.create({
      data: { restaurantId: membership.restaurantId, menuItemId: item.id, price: data.sellingPrice, reason: "CSV import" },
    });
  });
}

const expenseRow = z.object({
  category: z.string().trim().min(2),
  branchCode: z.string().trim().min(1),
  expenseDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  tax: z.coerce.number().min(0),
  type: z.nativeEnum(ExpenseType),
  recurrence: z.nativeEnum(RecurrenceType),
  payee: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

async function importExpense(row: Record<string, string>, membership: Membership) {
  const data = expenseRow.parse(row);
  const branch = await prisma.branch.findFirst({
    where: { restaurantId: membership.restaurantId, code: { equals: data.branchCode, mode: "insensitive" }, active: true, deletedAt: null },
  });
  if (!branch) throw new Error(`Branch "${data.branchCode}" was not found`);
  await prisma.$transaction(async (tx) => {
    const category = await tx.expenseCategory.upsert({
      where: { restaurantId_name: { restaurantId: membership.restaurantId, name: data.category } },
      update: { deletedAt: null },
      create: { restaurantId: membership.restaurantId, name: data.category },
    });
    await tx.expense.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        categoryId: category.id,
        expenseDate: data.expenseDate,
        amount: data.amount,
        tax: data.tax,
        type: data.type,
        recurrence: data.recurrence,
        payee: data.payee,
        paymentMethod: data.paymentMethod,
        description: data.description,
      },
    });
  });
}

const purchaseRow = z.object({
  invoiceNumber: z.string().trim().optional(),
  purchaseDate: z.coerce.date(),
  supplier: z.string().trim().min(2),
  branchCode: z.string().trim().min(1),
  ingredient: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  purchaseUnit: z.nativeEnum(Unit),
  unitPrice: z.coerce.number().min(0),
  batchNumber: z.string().trim().optional(),
  expiryDate: z.union([z.coerce.date(), z.literal("")]).optional(),
});

async function importPurchase(row: Record<string, string>, membership: Membership) {
  const data = purchaseRow.parse(row);
  const [supplier, branch, ingredient, existingPurchase] = await Promise.all([
    prisma.supplier.findFirst({ where: { restaurantId: membership.restaurantId, name: { equals: data.supplier, mode: "insensitive" }, active: true, deletedAt: null } }),
    prisma.branch.findFirst({ where: { restaurantId: membership.restaurantId, code: { equals: data.branchCode, mode: "insensitive" }, active: true, deletedAt: null } }),
    prisma.ingredient.findFirst({ where: { restaurantId: membership.restaurantId, name: { equals: data.ingredient, mode: "insensitive" }, active: true, deletedAt: null } }),
    data.invoiceNumber
      ? prisma.purchase.findFirst({
          where: {
            restaurantId: membership.restaurantId,
            invoiceNumber: data.invoiceNumber,
            deletedAt: null,
          },
          include: { items: { select: { ingredientId: true } } },
        })
      : null,
  ]);
  if (!supplier || !branch || !ingredient) throw new Error("Supplier, branch, or ingredient was not found");
  if (
    existingPurchase &&
    (existingPurchase.supplierId !== supplier.id ||
      existingPurchase.branchId !== branch.id)
  ) {
    throw new Error("Invoice already belongs to another supplier or branch");
  }
  if (existingPurchase?.items.some((item) => item.ingredientId === ingredient.id)) {
    throw new Error("Invoice already contains this ingredient");
  }
  const customFactor = data.purchaseUnit === ingredient.purchaseUnit ? ingredient.conversionFactor : undefined;
  const baseQuantity = convertQuantity(data.quantity, data.purchaseUnit, ingredient.baseUnit, customFactor);
  const lineTotal = new Prisma.Decimal(data.quantity).mul(data.unitPrice);
  const effectiveUnitCost = effectiveCostPerBaseUnit(lineTotal, baseQuantity, ingredient.wastePercentage);
  await prisma.$transaction(async (tx) => {
    const purchase = existingPurchase
      ? await tx.purchase.update({
          where: { id: existingPurchase.id },
          data: {
            subtotal: existingPurchase.subtotal.plus(lineTotal),
            total: existingPurchase.total.plus(lineTotal),
          },
        })
      : await tx.purchase.create({
          data: {
            restaurantId: membership.restaurantId,
            branchId: branch.id,
            supplierId: supplier.id,
            purchaseDate: data.purchaseDate,
            invoiceNumber: data.invoiceNumber || null,
            currency: membership.restaurant.currency,
            subtotal: lineTotal,
            total: lineTotal,
            paymentStatus: PaymentStatus.PENDING,
            notes: "Imported from CSV",
          },
        });
    const purchaseItem = await tx.purchaseItem.create({
      data: {
        restaurantId: membership.restaurantId,
        purchaseId: purchase.id,
        ingredientId: ingredient.id,
        purchasedQuantity: data.quantity,
        purchaseUnit: data.purchaseUnit,
        conversionFactor: baseQuantity.div(data.quantity),
        convertedBaseQuantity: baseQuantity,
        unitPrice: data.unitPrice,
        lineTotal,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate || null,
      },
    });
    const nextCost = weightedAverageCost({
      currentQuantity: ingredient.currentStock,
      currentUnitCost: ingredient.currentCostPerBaseUnit,
      incomingQuantity: baseQuantity,
      incomingUnitCost: effectiveUnitCost,
    });
    await tx.ingredient.update({
      where: { id: ingredient.id },
      data: { currentStock: ingredient.currentStock.plus(baseQuantity), currentCostPerBaseUnit: nextCost },
    });
    await tx.ingredientPriceHistory.create({
      data: { restaurantId: membership.restaurantId, ingredientId: ingredient.id, purchaseItemId: purchaseItem.id, pricePerBaseUnit: effectiveUnitCost, effectiveAt: data.purchaseDate },
    });
    await tx.inventoryTransaction.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        ingredientId: ingredient.id,
        createdById: membership.userId,
        type: InventoryTransactionType.PURCHASE,
        quantity: data.quantity,
        unit: data.purchaseUnit,
        baseQuantity,
        unitCost: effectiveUnitCost,
        totalCost: lineTotal,
        referenceType: "Purchase",
        referenceId: purchase.id,
        notes: "Imported from CSV",
      },
    });
  });
}

const saleRow = z.object({
  orderReference: z.string().trim().optional(),
  soldAt: z.coerce.date(),
  branchCode: z.string().trim().min(1),
  channel: z.string().trim().min(2),
  menuItem: z.string().trim().min(2),
  quantity: z.coerce.number().positive(),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  serviceCharge: z.coerce.number().min(0),
  paymentMethod: z.string().trim().optional(),
});

async function importSale(row: Record<string, string>, membership: Membership) {
  const data = saleRow.parse(row);
  const [branch, channel, item, existingSale] = await Promise.all([
    prisma.branch.findFirst({ where: { restaurantId: membership.restaurantId, code: { equals: data.branchCode, mode: "insensitive" }, active: true, deletedAt: null } }),
    prisma.salesChannel.findFirst({ where: { restaurantId: membership.restaurantId, name: { equals: data.channel, mode: "insensitive" }, active: true, deletedAt: null } }),
    prisma.menuItem.findFirst({ where: { restaurantId: membership.restaurantId, name: { equals: data.menuItem, mode: "insensitive" }, active: true, deletedAt: null }, include: { channelPrices: { where: { active: true } } } }),
    data.orderReference
      ? prisma.sale.findFirst({
          where: {
            restaurantId: membership.restaurantId,
            orderReference: data.orderReference,
            deletedAt: null,
          },
          include: { items: { select: { menuItemId: true } } },
        })
      : null,
  ]);
  if (!branch || !channel || !item) throw new Error("Branch, channel, or menu item was not found");
  if (
    existingSale &&
    (existingSale.branchId !== branch.id ||
      existingSale.salesChannelId !== channel.id)
  ) {
    throw new Error("Order already belongs to another branch or channel");
  }
  if (existingSale?.items.some((line) => line.menuItemId === item.id)) {
    throw new Error("Order already contains this menu item");
  }
  const price = item.channelPrices.find((entry) => entry.salesChannelId === channel.id)?.customerPrice ?? item.currentBaseSellingPrice;
  const snapshot = calculateSaleLineSnapshot({
    quantity: data.quantity,
    sellingPrice: price,
    foodCost: item.currentFoodCost,
    fullCost: item.currentFullCost,
    discount: data.discount,
    ...channel,
  });
  if (snapshot.netSales.lt(0)) throw new Error("Discount cannot exceed line sales");

  const requiredStock = new Map<string, Prisma.Decimal>();
  if (item.recipeId) {
    const [recipes, components] = await Promise.all([
      prisma.recipe.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, select: { id: true, numberOfServings: true, batchYield: true } }),
      prisma.recipeIngredient.findMany({ where: { restaurantId: membership.restaurantId }, select: { recipeId: true, ingredientId: true, subRecipeId: true, convertedBaseQuantity: true } }),
    ]);
    const componentMap = new Map<string, typeof components>();
    for (const component of components) componentMap.set(component.recipeId, [...(componentMap.get(component.recipeId) ?? []), component]);
    const usage = expandRecipeConsumption({
      recipeId: item.recipeId,
      servingsSold: new Prisma.Decimal(data.quantity).mul(item.servingMultiplier),
      recipeServings: new Map(recipes.map((recipe) => [recipe.id, recipe.numberOfServings])),
      recipeYields: new Map(recipes.map((recipe) => [recipe.id, recipe.batchYield])),
      componentsByRecipe: componentMap,
    });
    for (const [id, quantity] of usage) requiredStock.set(id, quantity);
  }
  const ingredients = await prisma.ingredient.findMany({ where: { restaurantId: membership.restaurantId, id: { in: [...requiredStock.keys()] }, active: true, deletedAt: null } });
  if (ingredients.length !== requiredStock.size) throw new Error("A recipe ingredient is unavailable");

  await prisma.$transaction(async (tx) => {
    const lineCost = snapshot.fullCostSnapshot
      .plus(snapshot.channelCommissionSnapshot)
      .plus(snapshot.otherChannelFeesSnapshot);
    const sale = existingSale
      ? await tx.sale.update({
          where: { id: existingSale.id },
          data: {
            subtotal: existingSale.subtotal.plus(snapshot.grossSales),
            discount: existingSale.discount.plus(data.discount),
            totalAmount: existingSale.totalAmount.plus(snapshot.netSales),
            totalCost: existingSale.totalCost.plus(lineCost),
            totalProfit: existingSale.totalProfit.plus(
              snapshot.calculatedProfitSnapshot,
            ),
          },
        })
      : await tx.sale.create({
          data: {
            restaurantId: membership.restaurantId,
            branchId: branch.id,
            salesChannelId: channel.id,
            soldAt: data.soldAt,
            orderReference: data.orderReference || null,
            subtotal: snapshot.grossSales,
            discount: data.discount,
            tax: data.tax,
            serviceCharge: data.serviceCharge,
            totalAmount: snapshot.netSales.plus(data.tax).plus(data.serviceCharge),
            totalCost: lineCost,
            totalProfit: snapshot.calculatedProfitSnapshot,
            paymentMethod: data.paymentMethod,
            notes: "Imported from CSV",
          },
        });
    await tx.saleItem.create({
      data: {
        restaurantId: membership.restaurantId,
        saleId: sale.id,
        menuItemId: item.id,
        quantity: data.quantity,
        sellingPriceSnapshot: price,
        discount: data.discount,
        netSales: snapshot.netSales,
        foodCostSnapshot: snapshot.foodCostSnapshot,
        fullCostSnapshot: snapshot.fullCostSnapshot,
        channelCommissionSnapshot: snapshot.channelCommissionSnapshot,
        otherChannelFeesSnapshot: snapshot.otherChannelFeesSnapshot,
        calculatedProfitSnapshot: snapshot.calculatedProfitSnapshot,
        profitMarginSnapshot: snapshot.profitMarginSnapshot,
      },
    });
    for (const ingredient of ingredients) {
      const usage = requiredStock.get(ingredient.id) ?? new Prisma.Decimal(0);
      const next = nextStockQuantity({
        currentQuantity: ingredient.currentStock,
        type: InventoryTransactionType.SALE_USAGE,
        baseQuantity: usage,
        allowNegative: membership.restaurant.allowNegativeStock,
      });
      await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentStock: next } });
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
          referenceId: sale.id,
          notes: "CSV sale recipe usage",
        },
      });
    }
    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Sale",
        entityId: sale.id,
        newValues: { source: "CSV", totalAmount: sale.totalAmount.toString() },
      },
    });
  });
}
