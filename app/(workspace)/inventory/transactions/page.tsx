import { format } from "date-fns";
import { ArrowLeft, History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function InventoryTransactionsPage() {
  const membership = await getVerifiedMembership();
  const transactions = await prisma.inventoryTransaction.findMany({ where: { restaurantId: membership.restaurantId }, include: { ingredient: { select: { name: true, baseUnit: true } }, branch: { select: { name: true } }, createdBy: { select: { name: true, email: true } } }, orderBy: { occurredAt: "desc" }, take: 200 });
  return <main className="min-h-screen"><PageHeader action={<Button asChild variant="outline"><a href="/inventory"><ArrowLeft />Inventory</a></Button>} description="Immutable movement ledger across every active branch." eyebrow="Inventory / Ledger" icon={History} title="Stock movements" /><div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8"><section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Ingredient</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Base quantity</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Recorded by</th><th className="px-4 py-3">Notes</th></tr></thead><tbody className="divide-y">{transactions.map((transaction) => <tr key={transaction.id}><td className="px-4 py-3 whitespace-nowrap">{format(transaction.occurredAt, "MMM d, yyyy HH:mm")}</td><td className="px-4 py-3 font-medium">{transaction.ingredient.name}</td><td className="px-4 py-3"><Badge variant={transaction.type.includes("OUT") || transaction.type.includes("USAGE") || transaction.type === "WASTE" ? "warning" : "default"}>{transaction.type.replaceAll("_", " ")}</Badge></td><td className="px-4 py-3">{transaction.branch.name}</td><td className="px-4 py-3 tabular-nums">{transaction.baseQuantity.toFixed(3)} {transaction.ingredient.baseUnit.toLowerCase()}</td><td className="px-4 py-3 tabular-nums">{formatMoney(transaction.totalCost.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3">{transaction.createdBy.name ?? transaction.createdBy.email}</td><td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">{transaction.notes ?? "—"}</td></tr>)}</tbody></table></div></section></div></main>;
}
