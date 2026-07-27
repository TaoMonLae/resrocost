import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { WasteForm } from "@/components/operations/waste-form";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function WastePage() {
  const membership = await getVerifiedMembership();
  const [records, branches, ingredients, recipes, menuItems] = await Promise.all([
    prisma.wasteRecord.findMany({ where: { restaurantId: membership.restaurantId }, include: { branch: true, ingredient: true, recipe: true, menuItem: true, recordedBy: { select: { name: true } } }, orderBy: { wasteDate: "desc" }, take: 100 }),
    prisma.branch.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ingredient.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.recipe.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.menuItem.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const cost = records.reduce((sum, record) => sum + record.cost.toNumber(), 0);
  return <main className="min-h-screen"><PageHeader action={<a className="text-sm font-medium text-[var(--forest)] hover:underline" href="#record-waste">Record waste</a>} description="Quantify ingredient, prepared-recipe, and menu-item loss." eyebrow="Actual performance" icon={Trash2} title="Waste" /><div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8"><div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]"><p className="text-xs text-muted-foreground">Recorded waste cost</p><p className="mt-2 text-xl font-medium">{formatMoney(cost, membership.restaurant.currency)}</p></div><section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Recorded by</th></tr></thead><tbody className="divide-y">{records.map((record) => <tr key={record.id}><td className="px-4 py-3">{record.wasteDate.toLocaleDateString()}</td><td className="px-4 py-3 font-medium">{record.ingredient?.name ?? record.recipe?.name ?? record.menuItem?.name}</td><td className="px-4 py-3"><Badge variant="warning">{record.reason.replaceAll("_", " ")}</Badge></td><td className="px-4 py-3">{record.quantity.toFixed(2)} {record.unit.toLowerCase()}</td><td className="px-4 py-3">{formatMoney(record.cost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{record.branch.name}</td><td className="px-4 py-3">{record.recordedBy.name ?? "Team member"}</td></tr>)}{!records.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={7}>No waste records yet.</td></tr>}</tbody></table></div></section><section className="scroll-mt-28 rounded-xl border bg-card p-5 shadow-[var(--shadow)]" id="record-waste"><h2 className="font-medium">Record waste</h2><p className="mt-1 text-xs text-muted-foreground">Ingredient waste also posts a stock-ledger deduction.</p><div className="mt-5"><WasteForm branches={branches} ingredients={ingredients} menuItems={menuItems} recipes={recipes} /></div></section></div></main>;
}
