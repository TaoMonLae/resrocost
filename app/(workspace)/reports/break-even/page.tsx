import { Calculator } from "lucide-react";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { calculateBreakEven } from "@/lib/services/reporting-service";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function BreakEvenPage() {
  const membership = await getVerifiedMembership();
  const [sales, fixedExpenses, units] = await Promise.all([
    prisma.sale.aggregate({ where: { restaurantId: membership.restaurantId, deletedAt: null }, _sum: { totalAmount: true, totalCost: true } }),
    prisma.expense.aggregate({ where: { restaurantId: membership.restaurantId, deletedAt: null, type: "FIXED" }, _sum: { amount: true, tax: true } }),
    prisma.saleItem.aggregate({ where: { restaurantId: membership.restaurantId, sale: { deletedAt: null } }, _sum: { quantity: true } }),
  ]);
  const recordedFixed = (fixedExpenses._sum.amount ?? new Prisma.Decimal(0)).plus(fixedExpenses._sum.tax ?? 0);
  const fixedCosts = Prisma.Decimal.max(recordedFixed, membership.restaurant.monthlyFixedExpenses);
  const result = calculateBreakEven({ fixedCosts, revenue: sales._sum.totalAmount ?? 0, variableCosts: sales._sum.totalCost ?? 0, unitsSold: units._sum.quantity ?? 0 });
  return <main className="min-h-screen"><PageHeader description="Required revenue and units based on actual contribution behaviour." eyebrow="Reports" icon={Calculator} title="Break-even analysis" /><div className="mx-auto max-w-[1200px] space-y-5 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Fixed-cost baseline" value={formatMoney(fixedCosts.toNumber(), membership.restaurant.currency)} /><Metric label="Contribution margin" value={formatPercent(result.contributionMarginRatio.mul(100).toNumber())} /><Metric label="Break-even revenue" value={result.breakEvenRevenue ? formatMoney(result.breakEvenRevenue.toNumber(), membership.restaurant.currency) : "Needs sales data"} /><Metric label="Break-even units" value={result.breakEvenUnits?.toFixed(0) ?? "Needs sales data"} /></section><Card><CardHeader><CardTitle>Margin of safety</CardTitle></CardHeader><CardContent><div className="h-4 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--forest)]" style={{ width: `${Math.max(0, Math.min(100, result.marginOfSafety.toNumber()))}%` }} /></div><div className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">Current revenue above break-even</span><span className="font-medium">{formatPercent(result.marginOfSafety.toNumber())}</span></div><div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3"><Stat label="Actual revenue" value={formatMoney((sales._sum.totalAmount ?? new Prisma.Decimal(0)).toNumber(), membership.restaurant.currency)} /><Stat label="Total contribution" value={formatMoney(result.contribution.toNumber(), membership.restaurant.currency)} /><Stat label="Contribution / unit" value={formatMoney(result.contributionPerUnit.toNumber(), membership.restaurant.currency)} /></div></CardContent></Card><p className="text-xs leading-5 text-muted-foreground">Fixed cost uses the higher of recorded fixed expenses and the restaurant’s configured monthly baseline. Variable cost uses immutable sale cost snapshots.</p></div></main>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-medium">{value}</p></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>; }
