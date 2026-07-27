"use server";

import {
  AuditAction,
  InventoryTransactionType,
  PaymentStatus,
  Prisma,
  Unit,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { effectiveCostPerBaseUnit } from "@/lib/services/ingredient-cost-service";
import {
  nextStockQuantity,
  weightedAverageCost,
} from "@/lib/services/inventory-service";
import { convertQuantity } from "@/lib/services/unit-conversion-service";

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

const ingredientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: optionalText,
  categoryName: z.string().trim().min(2).max(80),
  description: optionalText,
  baseUnit: z.nativeEnum(Unit),
  purchaseUnit: z.nativeEnum(Unit),
  conversionFactor: z.coerce.number().positive(),
  currentStock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  currentCostPerBaseUnit: z.coerce.number().min(0),
  wastePercentage: z.coerce.number().min(0).lt(100),
  preferredSupplierId: optionalText,
  storageLocation: optionalText,
  expiryTrackingEnabled: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactPerson: optionalText,
  phone: optionalText,
  email: z.union([z.string().email(), z.literal("")]).transform((value) => value || undefined),
  address: optionalText,
  taxNumber: optionalText,
  paymentTerms: optionalText,
  notes: optionalText,
});

export async function createIngredientAction(formData: FormData) {
  const membership = await requirePermission("ingredients:write");
  const data = ingredientSchema.parse(Object.fromEntries(formData));

  if (data.preferredSupplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: data.preferredSupplierId,
        restaurantId: membership.restaurantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!supplier) throw new Error("Preferred supplier is not available");
  }

  const ingredient = await prisma.$transaction(async (tx) => {
    const category = await tx.ingredientCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: membership.restaurantId,
          name: data.categoryName,
        },
      },
      update: { deletedAt: null },
      create: {
        restaurantId: membership.restaurantId,
        name: data.categoryName,
      },
    });

    const created = await tx.ingredient.create({
      data: {
        restaurantId: membership.restaurantId,
        categoryId: category.id,
        preferredSupplierId: data.preferredSupplierId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        baseUnit: data.baseUnit,
        purchaseUnit: data.purchaseUnit,
        conversionFactor: data.conversionFactor,
        currentStock: data.currentStock,
        minimumStock: data.minimumStock,
        reorderQuantity: data.reorderQuantity,
        currentCostPerBaseUnit: data.currentCostPerBaseUnit,
        wastePercentage: data.wastePercentage,
        usableYieldPercentage: 100 - data.wastePercentage,
        storageLocation: data.storageLocation,
        expiryTrackingEnabled: Boolean(data.expiryTrackingEnabled),
      },
    });

    const branch = await tx.branch.findFirst({
      where: {
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (branch && data.currentStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          restaurantId: membership.restaurantId,
          branchId: branch.id,
          ingredientId: created.id,
          createdById: membership.userId,
          type: InventoryTransactionType.OPENING_BALANCE,
          quantity: data.currentStock,
          unit: data.baseUnit,
          baseQuantity: data.currentStock,
          unitCost: data.currentCostPerBaseUnit,
          totalCost: new Prisma.Decimal(data.currentStock).mul(
            data.currentCostPerBaseUnit,
          ),
          notes: "Opening stock entered with ingredient",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Ingredient",
        entityId: created.id,
        newValues: {
          name: created.name,
          sku: created.sku,
          baseUnit: created.baseUnit,
        },
      },
    });

    return created;
  });

  revalidatePath("/ingredients");
  redirect(`/ingredients/${ingredient.id}`);
}

export async function createSupplierAction(formData: FormData) {
  const membership = await requirePermission("purchases:write");
  const data = supplierSchema.parse(Object.fromEntries(formData));

  await prisma.supplier.create({
    data: {
      restaurantId: membership.restaurantId,
      ...data,
    },
  });

  revalidatePath("/suppliers");
  redirect("/suppliers?created=1");
}

const purchaseHeaderSchema = z.object({
  supplierId: z.string().cuid(),
  branchId: z.string().cuid(),
  purchaseDate: z.coerce.date(),
  invoiceNumber: optionalText,
  currency: z.string().length(3),
  discount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  deliveryCharge: z.coerce.number().min(0),
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentMethod: optionalText,
  notes: optionalText,
});

export async function createPurchaseAction(formData: FormData) {
  const membership = await requirePermission("purchases:write");
  const header = purchaseHeaderSchema.parse(Object.fromEntries(formData));
  const ingredientIds = formData.getAll("ingredientId").map(String);
  const quantities = formData.getAll("quantity").map(Number);
  const purchaseUnits = formData.getAll("purchaseUnit").map(String);
  const unitPrices = formData.getAll("unitPrice").map(Number);
  const batchNumbers = formData.getAll("batchNumber").map(String);
  const expiryDates = formData.getAll("expiryDate").map(String);

  const rows = ingredientIds
    .map((ingredientId, index) => ({
      ingredientId,
      quantity: quantities[index],
      purchaseUnit: purchaseUnits[index] as Unit,
      unitPrice: unitPrices[index],
      batchNumber: batchNumbers[index] || undefined,
      expiryDate: expiryDates[index]
        ? new Date(expiryDates[index])
        : undefined,
    }))
    .filter((row) => row.ingredientId);

  if (!rows.length) throw new Error("Add at least one purchase item");
  if (new Set(rows.map((row) => row.ingredientId)).size !== rows.length) {
    throw new Error("Each ingredient can only appear once per purchase");
  }
  for (const row of rows) {
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
      throw new Error("Purchase quantities must be greater than zero");
    }
    if (!Number.isFinite(row.unitPrice) || row.unitPrice < 0) {
      throw new Error("Unit prices cannot be negative");
    }
    if (!Object.values(Unit).includes(row.purchaseUnit)) {
      throw new Error("Purchase unit is invalid");
    }
  }

  const [supplier, branch, ingredients] = await Promise.all([
    prisma.supplier.findFirst({
      where: {
        id: header.supplierId,
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.branch.findFirst({
      where: {
        id: header.branchId,
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.ingredient.findMany({
      where: {
        id: { in: rows.map((row) => row.ingredientId) },
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
    }),
  ]);

  if (!supplier || !branch || ingredients.length !== rows.length) {
    throw new Error("Purchase contains unavailable restaurant records");
  }

  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );
  const calculatedRows = rows.map((row) => {
    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) throw new Error("Ingredient is unavailable");
    const conversionFactor =
      row.purchaseUnit === ingredient.purchaseUnit
        ? ingredient.conversionFactor
        : row.purchaseUnit === ingredient.baseUnit
          ? new Prisma.Decimal(1)
          : undefined;
    const baseQuantity = convertQuantity(
      row.quantity,
      row.purchaseUnit,
      ingredient.baseUnit,
      conversionFactor,
    );
    const lineTotal = new Prisma.Decimal(row.quantity).mul(row.unitPrice);
    const effectiveUnitCost = effectiveCostPerBaseUnit(
      lineTotal,
      baseQuantity,
      ingredient.wastePercentage,
    );
    return {
      ...row,
      ingredient,
      conversionFactor: new Prisma.Decimal(baseQuantity).div(row.quantity),
      baseQuantity,
      lineTotal,
      effectiveUnitCost,
    };
  });

  const subtotal = calculatedRows.reduce(
    (sum, row) => sum.plus(row.lineTotal),
    new Prisma.Decimal(0),
  );
  const total = subtotal
    .minus(header.discount)
    .plus(header.tax)
    .plus(header.deliveryCharge);
  if (total.lt(0)) throw new Error("Purchase total cannot be negative");

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        supplierId: supplier.id,
        purchaseDate: header.purchaseDate,
        invoiceNumber: header.invoiceNumber,
        currency: header.currency.toUpperCase(),
        subtotal,
        discount: header.discount,
        tax: header.tax,
        deliveryCharge: header.deliveryCharge,
        total,
        paymentStatus: header.paymentStatus,
        paymentMethod: header.paymentMethod,
        notes: header.notes,
      },
    });

    for (const row of calculatedRows) {
      const purchaseItem = await tx.purchaseItem.create({
        data: {
          restaurantId: membership.restaurantId,
          purchaseId: created.id,
          ingredientId: row.ingredient.id,
          purchasedQuantity: row.quantity,
          purchaseUnit: row.purchaseUnit,
          conversionFactor: row.conversionFactor,
          convertedBaseQuantity: row.baseQuantity,
          unitPrice: row.unitPrice,
          lineTotal: row.lineTotal,
          batchNumber: row.batchNumber,
          expiryDate: row.expiryDate,
        },
      });

      const nextQuantity = row.ingredient.currentStock.plus(row.baseQuantity);
      const nextUnitCost = weightedAverageCost({
        currentQuantity: row.ingredient.currentStock,
        currentUnitCost: row.ingredient.currentCostPerBaseUnit,
        incomingQuantity: row.baseQuantity,
        incomingUnitCost: row.effectiveUnitCost,
      });

      await tx.ingredient.update({
        where: { id: row.ingredient.id },
        data: {
          currentStock: nextQuantity,
          currentCostPerBaseUnit: nextUnitCost,
        },
      });
      await tx.ingredientPriceHistory.create({
        data: {
          restaurantId: membership.restaurantId,
          ingredientId: row.ingredient.id,
          purchaseItemId: purchaseItem.id,
          pricePerBaseUnit: row.effectiveUnitCost,
          effectiveAt: header.purchaseDate,
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          restaurantId: membership.restaurantId,
          branchId: branch.id,
          ingredientId: row.ingredient.id,
          createdById: membership.userId,
          type: InventoryTransactionType.PURCHASE,
          quantity: row.quantity,
          unit: row.purchaseUnit,
          baseQuantity: row.baseQuantity,
          unitCost: row.effectiveUnitCost,
          totalCost: row.lineTotal,
          referenceType: "Purchase",
          referenceId: created.id,
          notes: header.invoiceNumber
            ? `Invoice ${header.invoiceNumber}`
            : "Purchase receipt",
          occurredAt: header.purchaseDate,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.CREATE,
        entityType: "Purchase",
        entityId: created.id,
        newValues: {
          invoiceNumber: created.invoiceNumber,
          total: created.total.toString(),
          itemCount: calculatedRows.length,
        },
      },
    });

    return created;
  });

  revalidatePath("/ingredients");
  revalidatePath("/inventory");
  revalidatePath("/purchases");
  redirect(`/purchases/${purchase.id}`);
}

const adjustmentSchema = z.object({
  ingredientId: z.string().cuid(),
  branchId: z.string().cuid(),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(240),
});

export async function adjustInventoryAction(formData: FormData) {
  const membership = await requirePermission("stock:use");
  const data = adjustmentSchema.parse(Object.fromEntries(formData));
  const type = InventoryTransactionType[data.type];

  const [ingredient, branch] = await Promise.all([
    prisma.ingredient.findFirst({
      where: {
        id: data.ingredientId,
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
    }),
    prisma.branch.findFirst({
      where: {
        id: data.branchId,
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!ingredient || !branch) throw new Error("Inventory record is unavailable");

  const nextQuantity = nextStockQuantity({
    currentQuantity: ingredient.currentStock,
    type,
    baseQuantity: data.quantity,
    allowNegative: membership.restaurant.allowNegativeStock,
  });

  await prisma.$transaction([
    prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { currentStock: nextQuantity },
    }),
    prisma.inventoryTransaction.create({
      data: {
        restaurantId: membership.restaurantId,
        branchId: branch.id,
        ingredientId: ingredient.id,
        createdById: membership.userId,
        type,
        quantity: data.quantity,
        unit: ingredient.baseUnit,
        baseQuantity: data.quantity,
        unitCost: ingredient.currentCostPerBaseUnit,
        totalCost: ingredient.currentCostPerBaseUnit.mul(data.quantity),
        notes: data.reason,
      },
    }),
    prisma.auditLog.create({
      data: {
        restaurantId: membership.restaurantId,
        userId: membership.userId,
        action: AuditAction.STOCK_ADJUSTMENT,
        entityType: "Ingredient",
        entityId: ingredient.id,
        oldValues: { currentStock: ingredient.currentStock.toString() },
        newValues: {
          currentStock: nextQuantity.toString(),
          reason: data.reason,
        },
      },
    }),
  ]);

  revalidatePath("/inventory");
  revalidatePath("/inventory/transactions");
  revalidatePath(`/ingredients/${ingredient.id}`);
  redirect("/inventory?adjusted=1");
}
