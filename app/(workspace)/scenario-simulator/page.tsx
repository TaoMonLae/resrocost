import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ScenarioSimulator } from "@/components/scenarios/scenario-simulator";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export default async function ScenarioSimulatorPage() {
  const membership = await requirePermission("reports:read");
  const [items, scenarios] = await Promise.all([
    prisma.menuItem.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, currentFoodCost: true, currentFullCost: true, currentBaseSellingPrice: true } }),
    prisma.scenario.findMany({ where: { restaurantId: membership.restaurantId }, orderBy: { updatedAt: "desc" }, take: 8 }),
  ]);
  return <main className="min-h-screen"><PageHeader description="Test cost, price, commission, volume, and fixed-cost changes safely." eyebrow="Decision support" icon={FlaskConical} title="Scenario simulator" /><div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8"><ScenarioSimulator currency={membership.restaurant.currency} items={items.map((item) => ({ id: item.id, name: item.name, foodCost: item.currentFoodCost.toNumber(), fullCost: item.currentFullCost.toNumber(), price: item.currentBaseSellingPrice.toNumber() }))} />{scenarios.length > 0 && <section><h2 className="mb-3 text-sm font-medium">Saved scenarios</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{scenarios.map((scenario) => <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]" key={scenario.id}><div className="flex justify-between gap-2"><h3 className="font-medium">{scenario.name}</h3><Badge variant="neutral">Saved</Badge></div><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{scenario.description ?? "No description"}</p><p className="mt-4 text-[10px] text-muted-foreground">Updated {scenario.updatedAt.toLocaleString()}</p></div>)}</div></section>}</div></main>;
}
