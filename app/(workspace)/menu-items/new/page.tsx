import { ChefHat } from "lucide-react";
import { createMenuItemAction } from "@/app/actions/menu";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export default async function NewMenuItemPage() {
  const membership = await requirePermission("menu:write");
  const recipes = await prisma.recipe.findMany({
    where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, currentCostPerServing: true },
  });
  return (
    <main className="min-h-screen">
      <PageHeader description="Combine recipe, operating costs, targets, and base price." eyebrow="Menu profitability" icon={ChefHat} title="New menu item" />
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        <form action={createMenuItemAction} className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Item name"><Input name="name" required /></Field>
            <Field label="SKU"><Input name="sku" /></Field>
            <Field label="Category"><Input name="categoryName" required /></Field>
            <Field label="Recipe">
              <Select name="recipeId" defaultValue="">
                <option value="">No recipe</option>
                {recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} ({recipe.currentCostPerServing.toFixed(2)}/serving)</option>)}
              </Select>
            </Field>
            <Field label="Serving multiplier"><Input defaultValue="1" min="0.01" name="servingMultiplier" step="any" type="number" required /></Field>
            <Field label={`Base selling price (${membership.restaurant.currency})`}><Input defaultValue="0" min="0" name="currentBaseSellingPrice" step="0.01" type="number" required /></Field>
            <Field label="Target food cost %"><Input defaultValue="30" max="99.99" min="0.01" name="targetFoodCostPercentage" step="0.01" type="number" required /></Field>
            <Field label="Target profit margin %"><Input defaultValue="40" max="99.99" min="0" name="targetProfitMargin" step="0.01" type="number" required /></Field>
            <CostField name="packagingCost" label="Packaging cost" />
            <CostField name="directLaborCost" label="Direct labour" />
            <CostField name="utilityCost" label="Utilities" />
            <CostField name="otherVariableCost" label="Other variable cost" />
            <CostField name="overheadAllocation" label="Overhead allocation" />
            <Field className="sm:col-span-2" label="Description"><Input name="description" /></Field>
          </div>
          <div className="mt-6 flex justify-end"><SubmitButton pendingLabel="Calculating economics…">Save menu item</SubmitButton></div>
        </form>
      </div>
    </main>
  );
}

function CostField({ name, label }: { name: string; label: string }) {
  return <Field label={label}><Input defaultValue="0" min="0" name={name} step="0.01" type="number" required /></Field>;
}
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block">{label}</Label>{children}</div>;
}
