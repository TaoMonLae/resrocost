import Link from "next/link";
import { Boxes, History } from "lucide-react";
import { adjustInventoryAction } from "@/app/actions/supply";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function InventoryPage() {
  const membership = await getVerifiedMembership();
  const [ingredients, branches] = await Promise.all([
    prisma.ingredient.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, include: { category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const value = ingredients.reduce((sum, item) => sum + item.currentStock.mul(item.currentCostPerBaseUnit).toNumber(), 0);
  const low = ingredients.filter((item) => item.currentStock.lte(item.minimumStock)).length;
  return <main className="min-h-screen"><PageHeader action={<Button asChild variant="outline"><Link href="/inventory/transactions"><History />Movement history</Link></Button>} description="Weighted-average inventory with a complete adjustment trail." eyebrow="Cost control" icon={Boxes} title="Inventory" /><div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-3"><Summary label="Inventory value" value={formatMoney(value, membership.restaurant.currency)} /><Summary label="Stocked ingredients" value={String(ingredients.length)} /><Summary label="Below minimum" value={String(low)} /></section><section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Ingredient</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Minimum</th><th className="px-4 py-3">Weighted cost</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{ingredients.map((ingredient) => { const isLow = ingredient.currentStock.lte(ingredient.minimumStock); return <tr key={ingredient.id}><td className="px-4 py-3 font-medium">{ingredient.name}</td><td className="px-4 py-3 text-muted-foreground">{ingredient.category?.name ?? "Uncategorised"}</td><td className="px-4 py-3 tabular-nums">{ingredient.currentStock.toFixed(3)} {ingredient.baseUnit.toLowerCase()}</td><td className="px-4 py-3 tabular-nums">{ingredient.minimumStock.toFixed(3)}</td><td className="px-4 py-3 tabular-nums">{formatMoney(ingredient.currentCostPerBaseUnit.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3"><Badge variant={isLow ? "warning" : "default"}>{isLow ? "Low" : "Healthy"}</Badge></td></tr>; })}</tbody></table></div></section><Card><CardContent className="p-5"><h2 className="text-base font-medium">Manual stock adjustment</h2><p className="mt-1 text-xs text-muted-foreground">A reason is required and the ledger is never overwritten.</p><form action={adjustInventoryAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="Ingredient"><Select name="ingredientId" required><option value="">Select ingredient</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Branch"><Select name="branchId" required><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field><Field label="Direction"><Select name="type"><option value="ADJUSTMENT_IN">Increase stock</option><option value="ADJUSTMENT_OUT">Decrease stock</option></Select></Field><Field label="Base quantity"><Input min="0.000001" name="quantity" required step="0.000001" type="number" /></Field><Field label="Reason"><Input name="reason" placeholder="Count variance" required /></Field><div className="flex justify-end sm:col-span-2 lg:col-span-5"><SubmitButton pendingLabel="Adjusting stock…">Save adjustment</SubmitButton></div></form></CardContent></Card></div></main>;
}
function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-medium">{value}</p></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="mb-2 block text-xs">{label}</Label>{children}</div>; }
