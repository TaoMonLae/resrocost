import Link from "next/link";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { calculateMenuEconomics } from "@/lib/services/pricing-service";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function PricingPage() {
  const membership = await getVerifiedMembership();
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
    include: { recipe: true, channelPrices: { include: { salesChannel: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <main className="min-h-screen">
      <PageHeader description="Compare current prices with food-cost and margin targets." eyebrow="Decision support" icon={Calculator} title="Pricing workbench" />
      <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-4 py-3">Menu item</th><th className="px-4 py-3">Food cost</th><th className="px-4 py-3">Full cost</th><th className="px-4 py-3">Current price</th><th className="px-4 py-3">Target: food cost</th><th className="px-4 py-3">Target: margin</th><th className="px-4 py-3">Current margin</th><th className="px-4 py-3">Channels</th></tr></thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const result = calculateMenuEconomics({
                    recipeCostPerServing: item.recipe?.currentCostPerServing ?? 0,
                    servingMultiplier: item.servingMultiplier,
                    packagingCost: item.packagingCost,
                    directLaborCost: item.directLaborCost,
                    utilityCost: item.utilityCost,
                    otherVariableCost: item.otherVariableCost,
                    overheadAllocation: item.overheadAllocation,
                    sellingPrice: item.currentBaseSellingPrice,
                    targetFoodCostPercentage: item.targetFoodCostPercentage,
                    targetProfitMargin: item.targetProfitMargin,
                  });
                  return <tr className="hover:bg-muted/40" key={item.id}><td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/menu-items/${item.id}`}>{item.name}</Link><p className="text-xs text-muted-foreground">{item.recipe?.name ?? "No recipe"}</p></td><td className="px-4 py-3">{formatMoney(item.currentFoodCost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(item.currentFullCost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3 font-medium">{formatMoney(item.currentBaseSellingPrice.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(result.suggestedPriceByFoodCost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{formatMoney(result.suggestedPriceByMargin.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3"><Badge variant={item.currentProfitMargin.gte(item.targetProfitMargin) ? "default" : "warning"}>{formatPercent(item.currentProfitMargin.toNumber())}</Badge></td><td className="px-4 py-3 text-muted-foreground">{item.channelPrices.length}</td></tr>;
                })}
                {!items.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={8}>Add a menu item to generate price targets.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
