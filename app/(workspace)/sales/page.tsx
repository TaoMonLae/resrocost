import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function SalesPage() {
  const membership = await getVerifiedMembership();
  const sales = await prisma.sale.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: { branch: true, salesChannel: true, _count: { select: { items: true } } },
    orderBy: { soldAt: "desc" },
    take: 100,
  });
  const totals = sales.reduce((result, sale) => ({ revenue: result.revenue + sale.totalAmount.toNumber(), profit: result.profit + sale.totalProfit.toNumber() }), { revenue: 0, profit: 0 });
  return (
    <main className="min-h-screen">
      <PageHeader action={<Button asChild><Link href="/sales/new"><Plus />Record sale</Link></Button>} description="Historical prices, costs, and channel fees remain frozen on every line." eyebrow="Actual performance" icon={CircleDollarSign} title="Sales" />
      <div className="mx-auto max-w-[1540px] space-y-5 px-5 py-7 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-3"><Summary label="Recorded revenue" value={formatMoney(totals.revenue, membership.restaurant.currency)} /><Summary label="Recorded profit" value={formatMoney(totals.profit, membership.restaurant.currency)} /><Summary label="Profit margin" value={formatPercent(totals.revenue ? totals.profit / totals.revenue * 100 : 0)} /></section>
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Date / order</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Profit</th></tr></thead><tbody className="divide-y">{sales.map((sale) => <tr className="hover:bg-muted/40" key={sale.id}><td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/sales/${sale.id}`}>{sale.orderReference ?? sale.id.slice(-8)}</Link><p className="text-xs text-muted-foreground">{sale.soldAt.toLocaleString()}</p></td><td className="px-4 py-3">{sale.branch.name}</td><td className="px-4 py-3">{sale.salesChannel.name}</td><td className="px-4 py-3">{sale._count.items}</td><td className="px-4 py-3">{formatMoney(sale.totalAmount.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(sale.totalCost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3 font-medium">{formatMoney(sale.totalProfit.toNumber(), membership.restaurant.currency)}</td></tr>)}{!sales.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={7}>No sales recorded yet.</td></tr>}</tbody></table></div></section>
      </div>
    </main>
  );
}
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-medium">{value}</p></div>; }
