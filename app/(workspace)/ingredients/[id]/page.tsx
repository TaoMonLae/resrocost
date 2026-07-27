import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, History, ShoppingBasket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const ingredient = await prisma.ingredient.findFirst({
    where: { id, restaurantId: membership.restaurantId, deletedAt: null },
    include: {
      category: true,
      preferredSupplier: true,
      priceHistory: {
        orderBy: { effectiveAt: "desc" },
        take: 12,
      },
      inventoryTransactions: {
        orderBy: { occurredAt: "desc" },
        take: 20,
        include: { branch: { select: { name: true } } },
      },
    },
  });
  if (!ingredient) notFound();
  const lowStock = ingredient.currentStock.lte(ingredient.minimumStock);

  return (
    <main className="min-h-screen">
      <PageHeader
        action={<Button asChild variant="outline"><a href="/ingredients"><ArrowLeft />Ingredients</a></Button>}
        eyebrow={`Ingredients / ${ingredient.sku ?? "No SKU"}`}
        icon={ShoppingBasket}
        title={ingredient.name}
      />
      <div className="mx-auto grid max-w-[1400px] gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b">
              <CardTitle>Stock position</CardTitle>
              <Badge variant={lowStock ? "warning" : "default"}>{lowStock ? "Reorder" : "In stock"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Current stock" value={`${ingredient.currentStock.toFixed(2)} ${ingredient.baseUnit.toLowerCase()}`} />
              <Metric label="Minimum stock" value={`${ingredient.minimumStock.toFixed(2)} ${ingredient.baseUnit.toLowerCase()}`} />
              <Metric label="Effective unit cost" value={formatMoney(ingredient.currentCostPerBaseUnit.toNumber(), membership.restaurant.currency)} />
              <Metric label="Stock value" value={formatMoney(ingredient.currentStock.mul(ingredient.currentCostPerBaseUnit).toNumber(), membership.restaurant.currency)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b"><CardTitle>Movement history</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Value</th></tr></thead>
                  <tbody className="divide-y">{ingredient.inventoryTransactions.map((transaction) => <tr key={transaction.id}><td className="px-4 py-3">{format(transaction.occurredAt, "MMM d, yyyy")}</td><td className="px-4 py-3"><Badge variant="neutral">{transaction.type.replaceAll("_", " ")}</Badge></td><td className="px-4 py-3 text-muted-foreground">{transaction.branch.name}</td><td className="px-4 py-3 tabular-nums">{transaction.baseQuantity.toFixed(3)} {ingredient.baseUnit.toLowerCase()}</td><td className="px-4 py-3 tabular-nums">{formatMoney(transaction.totalCost.toNumber(), membership.restaurant.currency)}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b"><CardTitle>Ingredient details</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Detail label="Category" value={ingredient.category?.name ?? "Uncategorised"} />
              <Detail label="Supplier" value={ingredient.preferredSupplier?.name ?? "Not set"} />
              <Detail label="Purchase unit" value={ingredient.purchaseUnit.toLowerCase()} />
              <Detail label="Conversion factor" value={ingredient.conversionFactor.toFixed(6)} />
              <Detail label="Waste allowance" value={`${ingredient.wastePercentage.toFixed(2)}%`} />
              <Detail label="Usable yield" value={`${ingredient.usableYieldPercentage.toFixed(2)}%`} />
              <Detail label="Storage" value={ingredient.storageLocation ?? "Not set"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center gap-2 border-b"><History className="size-4 text-muted-foreground" /><CardTitle>Price history</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">{ingredient.priceHistory.map((price) => <li className="flex items-center justify-between px-4 py-3" key={price.id}><span className="text-xs text-muted-foreground">{format(price.effectiveAt, "MMM d, yyyy")}</span><span className="text-sm font-medium tabular-nums">{formatMoney(price.pricePerBaseUnit.toNumber(), membership.restaurant.currency)}</span></li>)}{!ingredient.priceHistory.length && <li className="p-6 text-center text-xs text-muted-foreground">No purchase price history yet.</li>}</ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-medium tabular-nums">{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right text-sm">{value}</span></div>; }
