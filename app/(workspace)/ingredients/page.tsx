import Link from "next/link";
import { PackagePlus, Search, ShoppingBasket } from "lucide-react";
import { createIngredientAction } from "@/app/actions/supply";
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

const units = [
  "MILLIGRAM",
  "GRAM",
  "KILOGRAM",
  "MILLILITER",
  "LITER",
  "UNIT",
  "PIECE",
  "DOZEN",
  "TRAY",
  "BOX",
  "BAG",
  "PACK",
] as const;

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; category?: string }>;
}) {
  const membership = await getVerifiedMembership();
  const query = await searchParams;
  const [ingredients, categories, suppliers] = await Promise.all([
    prisma.ingredient.findMany({
      where: {
        restaurantId: membership.restaurantId,
        deletedAt: null,
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { sku: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(query.category ? { categoryId: query.category } : {}),
      },
      include: {
        category: { select: { name: true } },
        preferredSupplier: { select: { name: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      take: 100,
    }),
    prisma.ingredientCategory.findMany({
      where: { restaurantId: membership.restaurantId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: {
        restaurantId: membership.restaurantId,
        active: true,
        deletedAt: null,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const visibleIngredients = query.low === "1"
    ? ingredients.filter((item) => item.currentStock.lte(item.minimumStock))
    : ingredients;
  const lowStock = ingredients.filter((item) =>
    item.currentStock.lte(item.minimumStock),
  ).length;
  const inventoryValue = ingredients.reduce(
    (sum, item) =>
      sum + item.currentStock.mul(item.currentCostPerBaseUnit).toNumber(),
    0,
  );

  return (
    <main className="min-h-screen">
      <PageHeader
        action={
          <Button asChild>
            <a href="#new-ingredient">
              <PackagePlus />
              <span className="hidden sm:inline">Add ingredient</span>
            </a>
          </Button>
        }
        description="Track current stock, usable yield, and weighted cost."
        eyebrow="Cost control"
        icon={ShoppingBasket}
        title="Ingredients"
      />
      <div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-3">
          <Summary label="Active ingredients" value={String(ingredients.filter((i) => i.active).length)} />
          <Summary label="Low-stock items" tone={lowStock ? "warning" : undefined} value={String(lowStock)} />
          <Summary label="Inventory value" value={formatMoney(inventoryValue, membership.restaurant.currency)} />
        </section>

        <Card>
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input className="pl-9" defaultValue={query.q} name="q" placeholder="Search name or SKU" />
              </div>
              <Select defaultValue={query.category ?? ""} name="category">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
              <Button name="low" type="submit" value="1" variant={query.low === "1" ? "default" : "outline"}>
                Low stock
              </Button>
              <Button type="submit" variant="outline">Filter</Button>
            </form>
          </CardContent>
        </Card>

        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Ingredient</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Current stock</th>
                  <th className="px-4 py-3 font-medium">Unit cost</th>
                  <th className="px-4 py-3 font-medium">Stock value</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleIngredients.map((ingredient) => {
                  const isLow = ingredient.currentStock.lte(ingredient.minimumStock);
                  return (
                    <tr className="hover:bg-muted/40" key={ingredient.id}>
                      <td className="px-4 py-3">
                        <Link className="font-medium hover:underline" href={`/ingredients/${ingredient.id}`}>
                          {ingredient.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{ingredient.sku ?? "No SKU"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{ingredient.category?.name ?? "Uncategorised"}</td>
                      <td className="px-4 py-3 tabular-nums">{ingredient.currentStock.toFixed(2)} {ingredient.baseUnit.toLowerCase()}</td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(ingredient.currentCostPerBaseUnit.toNumber(), membership.restaurant.currency)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(ingredient.currentStock.mul(ingredient.currentCostPerBaseUnit).toNumber(), membership.restaurant.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ingredient.preferredSupplier?.name ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={isLow ? "warning" : "default"}>{isLow ? "Reorder" : "In stock"}</Badge></td>
                    </tr>
                  );
                })}
                {!visibleIngredients.length && (
                  <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={7}>No ingredients match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="scroll-mt-28 rounded-xl border bg-card p-5 shadow-[var(--shadow)]" id="new-ingredient">
          <div className="mb-5">
            <h2 className="text-base font-medium">Add ingredient</h2>
            <p className="mt-1 text-xs text-muted-foreground">Opening stock creates an inventory-ledger transaction.</p>
          </div>
          <form action={createIngredientAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="SKU"><Input name="sku" /></Field>
            <Field label="Category"><Input list="ingredient-categories" name="categoryName" required /></Field>
            <datalist id="ingredient-categories">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
            <Field label="Preferred supplier">
              <Select name="preferredSupplierId"><option value="">None</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</Select>
            </Field>
            <Field label="Base unit"><Select defaultValue="GRAM" name="baseUnit">{units.map((unit) => <option key={unit} value={unit}>{unit.toLowerCase()}</option>)}</Select></Field>
            <Field label="Purchase unit"><Select defaultValue="KILOGRAM" name="purchaseUnit">{units.map((unit) => <option key={unit} value={unit}>{unit.toLowerCase()}</option>)}</Select></Field>
            <Field label="Purchase-to-base factor"><Input defaultValue="1000" min="0.000001" name="conversionFactor" step="0.000001" type="number" /></Field>
            <Field label="Opening stock"><Input defaultValue="0" min="0" name="currentStock" step="0.000001" type="number" /></Field>
            <Field label="Cost per base unit"><Input defaultValue="0" min="0" name="currentCostPerBaseUnit" step="0.000001" type="number" /></Field>
            <Field label="Minimum stock"><Input defaultValue="0" min="0" name="minimumStock" step="0.000001" type="number" /></Field>
            <Field label="Reorder quantity"><Input defaultValue="0" min="0" name="reorderQuantity" step="0.000001" type="number" /></Field>
            <Field label="Waste percentage"><Input defaultValue="0" max="99.99" min="0" name="wastePercentage" step="0.01" type="number" /></Field>
            <Field label="Storage location"><Input name="storageLocation" /></Field>
            <Field className="sm:col-span-2" label="Description"><Input name="description" /></Field>
            <label className="flex items-center gap-2 text-sm"><input name="expiryTrackingEnabled" type="checkbox" /> Track expiry dates</label>
            <div className="flex items-end lg:col-span-3 lg:justify-end"><SubmitButton pendingLabel="Adding ingredient…">Add ingredient</SubmitButton></div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={tone === "warning" ? "mt-2 text-2xl font-medium text-[var(--amber)]" : "mt-2 text-2xl font-medium"}>{value}</p></CardContent></Card>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block text-xs">{label}</Label>{children}</div>;
}
