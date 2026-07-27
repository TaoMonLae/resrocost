import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeForm } from "@/components/menu/recipe-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export default async function NewRecipePage() {
  const membership = await requirePermission("recipes:write");
  const [ingredients, subRecipes] = await Promise.all([
    prisma.ingredient.findMany({
      where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, baseUnit: true },
    }),
    prisma.recipe.findMany({
      where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, yieldUnit: true },
    }),
  ]);
  return (
    <main className="min-h-screen">
      <PageHeader description="Build a costed batch from ingredients and reusable recipes." eyebrow="Recipe costing" icon={BookOpen} title="New recipe" />
      <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8">
        <RecipeForm
          currency={membership.restaurant.currency}
          ingredients={ingredients.map((item) => ({ id: item.id, name: item.name, unit: item.baseUnit }))}
          subRecipes={subRecipes.map((item) => ({ id: item.id, name: item.name, unit: item.yieldUnit }))}
        />
      </div>
    </main>
  );
}
