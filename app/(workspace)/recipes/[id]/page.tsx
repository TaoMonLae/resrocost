import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { id, restaurantId: membership.restaurantId, deletedAt: null },
    include: {
      category: true,
      ingredients: {
        include: { ingredient: true, subRecipe: true },
        orderBy: { sortOrder: "asc" },
      },
      versions: { orderBy: { version: "desc" }, take: 5 },
      menuItems: { where: { deletedAt: null }, select: { id: true, name: true } },
    },
  });
  if (!recipe) notFound();
  return (
    <main className="min-h-screen">
      <PageHeader description={recipe.category?.name ?? "Uncategorised"} eyebrow="Recipe" icon={BookOpen} title={recipe.name} />
      <div className="mx-auto grid max-w-[1540px] gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Costed components</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3">Component</th><th>Type</th><th>Quantity</th><th>Cost snapshot</th></tr></thead>
                <tbody className="divide-y">
                  {recipe.ingredients.map((row) => <tr key={row.id}><td className="py-3 font-medium">{row.ingredient?.name ?? row.subRecipe?.name}</td><td><Badge variant={row.subRecipe ? "info" : "neutral"}>{row.type.replaceAll("_", " ")}</Badge></td><td>{row.quantity.toFixed(3)} {row.unit.toLowerCase()}</td><td>{formatMoney(row.costSnapshot.toNumber(), membership.restaurant.currency)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Cost summary</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <Stat label="Direct batch cost" value={formatMoney(recipe.directBatchCost.toNumber(), membership.restaurant.currency)} />
            <Stat label={`Waste (${recipe.wastePercentage.toFixed(1)}%)`} value={formatMoney(recipe.currentBatchCost.minus(recipe.directBatchCost).toNumber(), membership.restaurant.currency)} />
            <Stat label="Total batch cost" value={formatMoney(recipe.currentBatchCost.toNumber(), membership.restaurant.currency)} />
            <Stat label="Cost per serving" value={formatMoney(recipe.currentCostPerServing.toNumber(), membership.restaurant.currency)} strong />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Version history</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            {recipe.versions.map((version) => <div className="flex justify-between border-b py-2 last:border-0" key={version.id}><span>Version {version.version}</span><span className="text-muted-foreground">{version.createdAt.toLocaleDateString()}</span></div>)}
          </CardContent></Card>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4 border-b pb-3 last:border-0"><span className="text-muted-foreground">{label}</span><span className={strong ? "font-semibold text-[var(--forest)]" : "font-medium"}>{value}</span></div>;
}
