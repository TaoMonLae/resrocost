import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function RecipesPage() {
  const membership = await getVerifiedMembership();
  const recipes = await prisma.recipe.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: {
      category: { select: { name: true } },
      _count: { select: { ingredients: true, menuItems: true } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <main className="min-h-screen">
      <PageHeader
        action={<Button asChild><Link href="/recipes/new"><Plus />New recipe</Link></Button>}
        description="Cost batches, portions, and reusable sub-recipes."
        eyebrow="Recipe costing"
        icon={BookOpen}
        title="Recipes"
      />
      <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr><th className="px-4 py-3">Recipe</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Components</th><th className="px-4 py-3">Batch cost</th><th className="px-4 py-3">Cost / serving</th><th className="px-4 py-3">Usage</th></tr>
              </thead>
              <tbody className="divide-y">
                {recipes.map((recipe) => (
                  <tr className="hover:bg-muted/40" key={recipe.id}>
                    <td className="px-4 py-3"><Link className="font-medium hover:underline" href={`/recipes/${recipe.id}`}>{recipe.name}</Link><p className="text-xs text-muted-foreground">{recipe.numberOfServings.toFixed(1)} servings</p></td>
                    <td className="px-4 py-3 text-muted-foreground">{recipe.category?.name ?? "Uncategorised"}</td>
                    <td className="px-4 py-3">{recipe._count.ingredients}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(recipe.currentBatchCost.toNumber(), membership.restaurant.currency)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(recipe.currentCostPerServing.toNumber(), membership.restaurant.currency)}</td>
                    <td className="px-4 py-3"><Badge variant={recipe._count.menuItems ? "default" : "neutral"}>{recipe._count.menuItems} menu items</Badge></td>
                  </tr>
                ))}
                {!recipes.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={6}>Create your first recipe to begin costing menu items.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
