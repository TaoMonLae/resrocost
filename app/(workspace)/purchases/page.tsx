import Link from "next/link";
import { format } from "date-fns";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function PurchasesPage() {
  const membership = await getVerifiedMembership();
  const purchases = await prisma.purchase.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: {
      supplier: { select: { name: true } },
      branch: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { purchaseDate: "desc" },
    take: 100,
  });
  const total = purchases.reduce((sum, purchase) => sum + purchase.total.toNumber(), 0);
  const unpaid = purchases.filter((purchase) =>
    ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(purchase.paymentStatus),
  ).length;

  return (
    <main className="min-h-screen">
      <PageHeader action={<Button asChild><Link href="/purchases/new"><Plus />New purchase</Link></Button>} description="Invoices update stock, price history, and weighted cost atomically." eyebrow="Cost control" icon={Receipt} title="Purchases" />
      <div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-3"><Summary label="Recorded purchases" value={String(purchases.length)} /><Summary label="Total spend" value={formatMoney(total, membership.restaurant.currency)} /><Summary label="Awaiting payment" value={String(unpaid)} /></section>
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Purchase</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y">{purchases.map((purchase) => <tr className="hover:bg-muted/40" key={purchase.id}><td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/purchases/${purchase.id}`}>{purchase.invoiceNumber ?? purchase.id.slice(-8)}</Link><p className="mt-0.5 text-xs text-muted-foreground">{format(purchase.purchaseDate, "MMM d, yyyy")}</p></td><td className="px-4 py-3">{purchase.supplier.name}</td><td className="px-4 py-3 text-muted-foreground">{purchase.branch.name}</td><td className="px-4 py-3 tabular-nums">{purchase._count.items}</td><td className="px-4 py-3"><Badge variant={purchase.paymentStatus === "PAID" ? "default" : purchase.paymentStatus === "OVERDUE" ? "critical" : "warning"}>{purchase.paymentStatus.replaceAll("_", " ")}</Badge></td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(purchase.total.toNumber(), purchase.currency)}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}
function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-medium">{value}</p></CardContent></Card>; }
