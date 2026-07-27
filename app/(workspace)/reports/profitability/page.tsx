import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function ProfitabilityReportPage() {
  const membership = await getVerifiedMembership();
  const lines = await prisma.saleItem.findMany({
    where: { restaurantId: membership.restaurantId, sale: { deletedAt: null } },
    include: { menuItem: { select: { id: true, name: true, category: { select: { name: true } } } } },
  });
  const grouped = new Map<string, { name: string; category: string; quantity: number; revenue: number; foodCost: number; fullCost: number; fees: number; profit: number }>();
  for (const line of lines) {
    const current = grouped.get(line.menuItemId) ?? { name: line.menuItem.name, category: line.menuItem.category?.name ?? "Uncategorised", quantity: 0, revenue: 0, foodCost: 0, fullCost: 0, fees: 0, profit: 0 };
    current.quantity += line.quantity.toNumber();
    current.revenue += line.netSales.toNumber();
    current.foodCost += line.foodCostSnapshot.toNumber();
    current.fullCost += line.fullCostSnapshot.toNumber();
    current.fees += line.channelCommissionSnapshot.plus(line.otherChannelFeesSnapshot).toNumber();
    current.profit += line.calculatedProfitSnapshot.toNumber();
    grouped.set(line.menuItemId, current);
  }
  const rows = [...grouped.values()].sort((a, b) => b.profit - a.profit);
  return <main className="min-h-screen"><PageHeader description="Actual item contribution based on frozen sale snapshots." eyebrow="Reports" icon={TrendingUp} title="Profitability" /><div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8"><section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty sold</th><th className="px-4 py-3">Net revenue</th><th className="px-4 py-3">Food cost</th><th className="px-4 py-3">Full cost</th><th className="px-4 py-3">Channel fees</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin</th></tr></thead><tbody className="divide-y">{rows.map((row) => { const margin = row.revenue ? row.profit / row.revenue * 100 : 0; return <tr key={row.name}><td className="px-4 py-3 font-medium">{row.name}<p className="text-xs font-normal text-muted-foreground">{row.category}</p></td><td className="px-4 py-3">{row.quantity.toFixed(1)}</td><td className="px-4 py-3">{formatMoney(row.revenue, membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(row.foodCost, membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(row.fullCost, membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(row.fees, membership.restaurant.currency)}</td><td className="px-4 py-3 font-medium">{formatMoney(row.profit, membership.restaurant.currency)}</td><td className="px-4 py-3"><Badge variant={margin < 0 ? "critical" : margin < membership.restaurant.defaultProfitMargin.toNumber() ? "warning" : "default"}>{formatPercent(margin)}</Badge></td></tr>; })}{!rows.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={8}>Record sales to populate profitability.</td></tr>}</tbody></table></div></section></div></main>;
}
