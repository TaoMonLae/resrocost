import { notFound } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const sale = await prisma.sale.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null }, include: { branch: true, salesChannel: true, items: { include: { menuItem: true } } } });
  if (!sale) notFound();
  return <main className="min-h-screen"><PageHeader description={`${sale.branch.name} · ${sale.salesChannel.name}`} eyebrow="Sale snapshot" icon={CircleDollarSign} title={sale.orderReference ?? `Sale ${sale.id.slice(-8)}`} /><div className="mx-auto max-w-[1540px] space-y-5 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-3"><Metric label="Total amount" value={formatMoney(sale.totalAmount.toNumber(), membership.restaurant.currency)} /><Metric label="Total cost" value={formatMoney(sale.totalCost.toNumber(), membership.restaurant.currency)} /><Metric label="Total profit" value={formatMoney(sale.totalProfit.toNumber(), membership.restaurant.currency)} /></section><Card><CardHeader><CardTitle>Immutable line snapshots</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3">Item</th><th>Qty</th><th>Price</th><th>Net sales</th><th>Food cost</th><th>Full cost</th><th>Channel fees</th><th>Profit / margin</th></tr></thead><tbody className="divide-y">{sale.items.map((item) => <tr key={item.id}><td className="py-3 font-medium">{item.menuItem.name}</td><td>{item.quantity.toFixed(2)}</td><td>{formatMoney(item.sellingPriceSnapshot.toNumber(), membership.restaurant.currency)}</td><td>{formatMoney(item.netSales.toNumber(), membership.restaurant.currency)}</td><td>{formatMoney(item.foodCostSnapshot.toNumber(), membership.restaurant.currency)}</td><td>{formatMoney(item.fullCostSnapshot.toNumber(), membership.restaurant.currency)}</td><td>{formatMoney(item.channelCommissionSnapshot.plus(item.otherChannelFeesSnapshot).toNumber(), membership.restaurant.currency)}</td><td>{formatMoney(item.calculatedProfitSnapshot.toNumber(), membership.restaurant.currency)} · {formatPercent(item.profitMarginSnapshot.toNumber())}</td></tr>)}</tbody></table></div></CardContent></Card></div></main>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-medium">{value}</p></div>; }
