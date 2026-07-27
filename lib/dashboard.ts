import "server-only";

import { AlertSeverity, Prisma } from "@prisma/client";
import { eachDayOfInterval, endOfDay, format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";

const zero = new Prisma.Decimal(0);

export type DashboardSummary = Awaited<
  ReturnType<typeof getDashboardSummary>
>;

export async function getDashboardSummary(restaurantId: string, now = new Date()) {
  const from = startOfMonth(now);
  const to = endOfDay(now);

  const [
    restaurant,
    sales,
    purchases,
    fixedExpenses,
    ingredients,
    alerts,
  ] = await Promise.all([
    prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: {
        currency: true,
        monthlyFixedExpenses: true,
        defaultFoodCostPercent: true,
        defaultProfitMargin: true,
      },
    }),
    prisma.sale.findMany({
      where: {
        restaurantId,
        soldAt: { gte: from, lte: to },
        deletedAt: null,
      },
      select: {
        soldAt: true,
        totalAmount: true,
        totalCost: true,
        totalProfit: true,
      },
    }),
    prisma.purchase.aggregate({
      where: {
        restaurantId,
        purchaseDate: { gte: from, lte: to },
        deletedAt: null,
        reversedAt: null,
      },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: {
        restaurantId,
        expenseDate: { gte: from, lte: to },
        type: "FIXED",
        deletedAt: null,
      },
      _sum: { amount: true },
    }),
    prisma.ingredient.findMany({
      where: { restaurantId, active: true, deletedAt: null },
      select: {
        currentStock: true,
        currentCostPerBaseUnit: true,
      },
    }),
    prisma.alert.findMany({
      where: { restaurantId, resolvedAt: null },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        createdAt: true,
      },
    }),
  ]);

  const totalSales = sales.reduce(
    (sum, sale) => sum.plus(sale.totalAmount),
    new Prisma.Decimal(0),
  );
  const totalCost = sales.reduce(
    (sum, sale) => sum.plus(sale.totalCost),
    new Prisma.Decimal(0),
  );
  const grossProfit = totalSales.minus(totalCost);
  const totalProfit = sales.reduce(
    (sum, sale) => sum.plus(sale.totalProfit),
    new Prisma.Decimal(0),
  );
  const ingredientSpend = purchases._sum.total ?? zero;
  const recordedFixedExpenses = fixedExpenses._sum.amount ?? zero;
  const fixedExpenseTarget = restaurant.monthlyFixedExpenses;
  const fixedExpenseTotal = Prisma.Decimal.max(
    recordedFixedExpenses,
    fixedExpenseTarget,
  );
  const estimatedNetProfit = totalProfit.minus(fixedExpenseTotal);
  const inventoryValue = ingredients.reduce(
    (sum, item) =>
      sum.plus(item.currentStock.mul(item.currentCostPerBaseUnit)),
    zero,
  );
  const averageFoodCostPercentage = totalSales.isZero()
    ? zero
    : totalCost.div(totalSales).mul(100);
  const averageProfitMargin = totalSales.isZero()
    ? zero
    : totalProfit.div(totalSales).mul(100);
  const breakEvenProgress = fixedExpenseTotal.isZero()
    ? new Prisma.Decimal(100)
    : Prisma.Decimal.min(
        totalProfit.div(fixedExpenseTotal).mul(100),
        new Prisma.Decimal(100),
      );
  const dailyTotals = new Map<string, { revenue: number; profit: number }>();
  for (const sale of sales) {
    const key = format(sale.soldAt, "yyyy-MM-dd");
    const current = dailyTotals.get(key) ?? { revenue: 0, profit: 0 };
    current.revenue += sale.totalAmount.toNumber();
    current.profit += sale.totalProfit.toNumber();
    dailyTotals.set(key, current);
  }
  const trend = eachDayOfInterval({ start: from, end: to }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const total = dailyTotals.get(key) ?? { revenue: 0, profit: 0 };
    return { date: format(day, "MMM d"), ...total };
  });

  return {
    currency: restaurant.currency,
    period: { from, to },
    metrics: {
      totalSales,
      ingredientSpend,
      variableCost: totalCost,
      grossProfit,
      estimatedNetProfit,
      averageFoodCostPercentage,
      averageProfitMargin,
      fixedExpenses: fixedExpenseTotal,
      breakEvenProgress,
      inventoryValue,
    },
    targets: {
      foodCostPercentage: restaurant.defaultFoodCostPercent,
      profitMargin: restaurant.defaultProfitMargin,
    },
    trend,
    alerts: alerts.map((alert) => ({
      ...alert,
      severityRank:
        alert.severity === AlertSeverity.CRITICAL
          ? 3
          : alert.severity === AlertSeverity.WARNING
            ? 2
            : 1,
    })),
  };
}
