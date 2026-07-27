import { notFound } from "next/navigation";
import { ChefHat } from "lucide-react";
import { updateMenuPriceAction, upsertChannelPriceAction } from "@/app/actions/menu";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { calculateChannelEconomics, calculateMenuEconomics } from "@/lib/services/pricing-service";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

export default async function MenuItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const [item, channels] = await Promise.all([
    prisma.menuItem.findFirst({
      where: { id, restaurantId: membership.restaurantId, deletedAt: null },
      include: {
        recipe: true,
        category: true,
        priceHistory: { orderBy: { effectiveAt: "desc" }, take: 8 },
        channelPrices: { include: { salesChannel: true }, orderBy: { salesChannel: { name: "asc" } } },
      },
    }),
    prisma.salesChannel.findMany({
      where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!item) notFound();
  const suggestions = calculateMenuEconomics({
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
  return (
    <main className="min-h-screen">
      <PageHeader description={`${item.category?.name ?? "Uncategorised"} · ${item.recipe?.name ?? "No linked recipe"}`} eyebrow="Menu item" icon={ChefHat} title={item.name} />
      <div className="mx-auto grid max-w-[1540px] gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Selling price" value={formatMoney(item.currentBaseSellingPrice.toNumber(), membership.restaurant.currency)} />
            <Metric label="Food cost" value={formatMoney(item.currentFoodCost.toNumber(), membership.restaurant.currency)} />
            <Metric label="Full cost" value={formatMoney(item.currentFullCost.toNumber(), membership.restaurant.currency)} />
            <Metric label="Profit margin" value={formatPercent(item.currentProfitMargin.toNumber())} />
          </section>
          <Card><CardHeader><CardTitle>Channel economics</CardTitle></CardHeader><CardContent className="space-y-3">
            {item.channelPrices.map((channelPrice) => {
              const economics = calculateChannelEconomics({
                customerPrice: channelPrice.customerPrice,
                fullCost: item.currentFullCost,
                ...channelPrice.salesChannel,
              });
              return <div className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-4" key={channelPrice.id}><div><p className="font-medium">{channelPrice.salesChannel.name}</p><Badge variant="neutral">{channelPrice.salesChannel.type.replaceAll("_", " ")}</Badge></div><Stat label="Customer price" value={formatMoney(channelPrice.customerPrice.toNumber(), membership.restaurant.currency)} /><Stat label="Channel fees" value={formatMoney(economics.channelFees.toNumber(), membership.restaurant.currency)} /><Stat label="Profit" value={`${formatMoney(economics.profit.toNumber(), membership.restaurant.currency)} · ${formatPercent(economics.margin.toNumber())}`} /></div>;
            })}
            {!item.channelPrices.length && <p className="py-8 text-center text-sm text-muted-foreground">No channel prices configured yet.</p>}
          </CardContent></Card>
        </div>
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Pricing decision</CardTitle></CardHeader><CardContent>
            <div className="mb-4 space-y-2 text-sm"><Stat label="Food-cost target" value={formatMoney(suggestions.suggestedPriceByFoodCost.toNumber(), membership.restaurant.currency)} /><Stat label="Margin target" value={formatMoney(suggestions.suggestedPriceByMargin.toNumber(), membership.restaurant.currency)} /></div>
            <form action={updateMenuPriceAction} className="space-y-3">
              <input name="menuItemId" type="hidden" value={item.id} />
              <div><Label className="mb-2 block">New base price</Label><Input defaultValue={item.currentBaseSellingPrice.toFixed(2)} min="0" name="price" step="0.01" type="number" required /></div>
              <div><Label className="mb-2 block">Reason</Label><Input name="reason" placeholder="Annual review" /></div>
              <SubmitButton className="w-full">Update price</SubmitButton>
            </form>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Add channel price</CardTitle></CardHeader><CardContent>
            <form action={upsertChannelPriceAction} className="space-y-3">
              <input name="menuItemId" type="hidden" value={item.id} />
              <Select name="salesChannelId" required><option value="">Select channel</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</Select>
              <Input min="0" name="customerPrice" placeholder="Customer price" step="0.01" type="number" required />
              <SubmitButton className="w-full" variant="outline">Save channel price</SubmitButton>
            </form>
          </CardContent></Card>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-medium tabular-nums">{value}</p></div>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium tabular-nums">{value}</p></div>;
}
