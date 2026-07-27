import Link from "next/link";
import { BarChart3, Calculator, Grid2X2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

const reportLinks = [
  { href: "/reports/profitability", title: "Profitability", description: "Revenue, full cost, channel fees, and contribution by menu item.", icon: TrendingUp },
  { href: "/reports/menu-engineering", title: "Menu engineering", description: "Stars, plowhorses, puzzles, and dogs from actual demand.", icon: Grid2X2 },
  { href: "/reports/break-even", title: "Break-even", description: "Contribution margin, required sales, and margin of safety.", icon: Calculator },
];

export default async function ReportsPage() {
  const membership = await getVerifiedMembership();
  const [sales, expenses, waste] = await Promise.all([
    prisma.sale.aggregate({ where: { restaurantId: membership.restaurantId, deletedAt: null }, _sum: { totalAmount: true, totalProfit: true } }),
    prisma.expense.aggregate({ where: { restaurantId: membership.restaurantId, deletedAt: null }, _sum: { amount: true, tax: true } }),
    prisma.wasteRecord.aggregate({ where: { restaurantId: membership.restaurantId }, _sum: { cost: true } }),
  ]);
  const revenue = sales._sum.totalAmount?.toNumber() ?? 0;
  const saleProfit = sales._sum.totalProfit?.toNumber() ?? 0;
  const operatingExpenses = (expenses._sum.amount?.toNumber() ?? 0) + (expenses._sum.tax?.toNumber() ?? 0);
  const wasteCost = waste._sum.cost?.toNumber() ?? 0;
  const net = saleProfit - operatingExpenses - wasteCost;
  return <main className="min-h-screen"><PageHeader description="Decision-grade analysis from immutable sales and operating records." eyebrow="Intelligence" icon={BarChart3} title="Reports" /><div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Lifetime revenue" value={formatMoney(revenue, membership.restaurant.currency)} /><Metric label="Sale contribution" value={formatMoney(saleProfit, membership.restaurant.currency)} /><Metric label="Operating expenses + waste" value={formatMoney(operatingExpenses + wasteCost, membership.restaurant.currency)} /><Metric label="Estimated net" value={`${formatMoney(net, membership.restaurant.currency)} · ${formatPercent(revenue ? net / revenue * 100 : 0)}`} /></section><section className="grid gap-4 lg:grid-cols-3">{reportLinks.map(({ href, title, description, icon: Icon }) => <Link href={href} key={href}><Card className="h-full transition hover:-translate-y-0.5 hover:border-[var(--forest)]"><CardContent className="p-5"><span className="grid size-10 place-items-center rounded-lg bg-[var(--forest-soft)] text-[var(--forest)]"><Icon className="size-4" /></span><h2 className="mt-5 font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><p className="mt-5 text-xs font-medium text-[var(--forest)]">Open report →</p></CardContent></Card></Link>)}</section></div></main>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-medium">{value}</p></div>; }
