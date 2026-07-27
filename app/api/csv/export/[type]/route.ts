import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  csvTemplates,
  serializeCsv,
  type CsvTemplateType,
} from "@/lib/services/csv-service";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const membership = await prisma.restaurantMember.findFirst({
    where: { userId: session.user.id, restaurant: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
  });
  if (!membership || !can(membership.role, "reports:export")) {
    return NextResponse.json({ error: "Export permission required" }, { status: 403 });
  }
  const { type } = await params;
  if (!(type in csvTemplates)) {
    return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
  }
  const csvType = type as CsvTemplateType;
  const rows = await exportRows(csvType, membership.restaurantId);
  const body = serializeCsv(csvTemplates[csvType], rows);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="restrocost-${type}-export.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function exportRows(type: CsvTemplateType, restaurantId: string) {
  if (type === "ingredients") {
    const records = await prisma.ingredient.findMany({
      where: { restaurantId, deletedAt: null },
      include: { category: true },
      orderBy: { name: "asc" },
      take: 10_000,
    });
    return records.map((item) => ({
      name: item.name,
      sku: item.sku,
      category: item.category?.name,
      baseUnit: item.baseUnit,
      purchaseUnit: item.purchaseUnit,
      conversionFactor: item.conversionFactor,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      unitCost: item.currentCostPerBaseUnit,
      wastePercentage: item.wastePercentage,
    }));
  }
  if (type === "suppliers") {
    return prisma.supplier.findMany({
      where: { restaurantId, deletedAt: null },
      select: {
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        address: true,
        paymentTerms: true,
      },
      orderBy: { name: "asc" },
      take: 10_000,
    });
  }
  if (type === "purchases") {
    const records = await prisma.purchaseItem.findMany({
      where: { restaurantId, purchase: { deletedAt: null } },
      include: { purchase: { include: { supplier: true, branch: true } }, ingredient: true },
      orderBy: { purchase: { purchaseDate: "desc" } },
      take: 10_000,
    });
    return records.map((item) => ({
      invoiceNumber: item.purchase.invoiceNumber,
      purchaseDate: item.purchase.purchaseDate.toISOString(),
      supplier: item.purchase.supplier.name,
      branchCode: item.purchase.branch.code,
      ingredient: item.ingredient.name,
      quantity: item.purchasedQuantity,
      purchaseUnit: item.purchaseUnit,
      unitPrice: item.unitPrice,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate?.toISOString() ?? "",
    }));
  }
  if (type === "menu-items") {
    const records = await prisma.menuItem.findMany({
      where: { restaurantId, deletedAt: null },
      include: { category: true, recipe: true },
      orderBy: { name: "asc" },
      take: 10_000,
    });
    return records.map((item) => ({
      name: item.name,
      sku: item.sku,
      category: item.category?.name,
      recipe: item.recipe?.name,
      sellingPrice: item.currentBaseSellingPrice,
      targetFoodCostPercentage: item.targetFoodCostPercentage,
      targetProfitMargin: item.targetProfitMargin,
      packagingCost: item.packagingCost,
      directLaborCost: item.directLaborCost,
      utilityCost: item.utilityCost,
      otherVariableCost: item.otherVariableCost,
      overheadAllocation: item.overheadAllocation,
    }));
  }
  if (type === "sales") {
    const records = await prisma.saleItem.findMany({
      where: { restaurantId, sale: { deletedAt: null } },
      include: { sale: { include: { branch: true, salesChannel: true } }, menuItem: true },
      orderBy: { sale: { soldAt: "desc" } },
      take: 10_000,
    });
    return records.map((item) => ({
      orderReference: item.sale.orderReference,
      soldAt: item.sale.soldAt.toISOString(),
      branchCode: item.sale.branch.code,
      channel: item.sale.salesChannel.name,
      menuItem: item.menuItem.name,
      quantity: item.quantity,
      discount: item.discount,
      tax: item.sale.tax,
      serviceCharge: item.sale.serviceCharge,
      paymentMethod: item.sale.paymentMethod,
    }));
  }
  const records = await prisma.expense.findMany({
    where: { restaurantId, deletedAt: null },
    include: { category: true, branch: true },
    orderBy: { expenseDate: "desc" },
    take: 10_000,
  });
  return records.map((item) => ({
    category: item.category.name,
    branchCode: item.branch.code,
    expenseDate: item.expenseDate.toISOString(),
    amount: item.amount,
    tax: item.tax,
    type: item.type,
    recurrence: item.recurrence,
    payee: item.payee,
    paymentMethod: item.paymentMethod,
    description: item.description,
  }));
}
