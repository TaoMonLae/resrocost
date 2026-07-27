import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

const statusVariant = {
  EXCELLENT: "default",
  ACCEPTABLE: "info",
  LOW_MARGIN: "warning",
  LOSS: "critical",
} as const;

export default async function MenuItemsPage() {
  const membership = await getVerifiedMembership();
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: { category: true, recipe: true, _count: { select: { channelPrices: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <main className="min-h-screen">
      <PageHeader
        action={<Button asChild><Link href="/menu-items/new"><Plus />New menu item</Link></Button>}
        description="See the complete cost and contribution of every sellable item."
        eyebrow="Menu profitability"
        icon={ChefHat}
        title="Menu items"
      />
      <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link className="rounded-xl border bg-card p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--forest)]" href={`/menu-items/${item.id}`} key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-medium">{item.name}</h2><p className="mt-1 text-xs text-muted-foreground">{item.category?.name ?? "Uncategorised"} · {item.recipe?.name ?? "No recipe"}</p></div>
                <Badge variant={statusVariant[item.status]}>{item.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
                <Metric label="Price" value={formatMoney(item.currentBaseSellingPrice.toNumber(), membership.restaurant.currency)} />
                <Metric label="Full cost" value={formatMoney(item.currentFullCost.toNumber(), membership.restaurant.currency)} />
                <Metric label="Margin" value={formatPercent(item.currentProfitMargin.toNumber())} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{item._count.channelPrices} channel prices configured</p>
            </Link>
          ))}
          {!items.length && <div className="col-span-full rounded-xl border border-dashed p-14 text-center text-sm text-muted-foreground">Create a menu item to turn recipe costs into pricing decisions.</div>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium tabular-nums">{value}</p></div>;
}
