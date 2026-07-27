"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createRecipeAction } from "@/app/actions/menu";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const units = [
  "MILLIGRAM", "GRAM", "KILOGRAM", "MILLILITER", "LITER", "UNIT",
  "PIECE", "DOZEN", "TRAY", "BOX", "BAG", "PACK",
] as const;
const ingredientTypes = [
  "INGREDIENT", "PACKAGING", "CONDIMENT", "COOKING_OIL", "GARNISH",
] as const;

type Option = { id: string; name: string; unit: string };
type Row = { key: number; type: string };

export function RecipeForm({
  ingredients,
  subRecipes,
  currency,
}: {
  ingredients: Option[];
  subRecipes: Option[];
  currency: string;
}) {
  const [rows, setRows] = useState<Row[]>([{ key: 1, type: "INGREDIENT" }]);
  const [nextKey, setNextKey] = useState(2);

  return (
    <form action={createRecipeAction} className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]">
        <h2 className="text-base font-medium">Recipe details</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Recipe name"><Input name="name" required /></Field>
          <Field label="Category"><Input name="categoryName" required /></Field>
          <Field label="Batch yield"><Input min="0.000001" name="batchYield" step="any" type="number" defaultValue="1" required /></Field>
          <Field label="Yield unit">
            <Select name="yieldUnit" defaultValue="UNIT">
              {units.map((unit) => <option key={unit}>{unit}</option>)}
            </Select>
          </Field>
          <Field label="Servings"><Input min="0.01" name="numberOfServings" step="any" type="number" defaultValue="1" required /></Field>
          <Field label="Waste %"><Input min="0" max="99.99" name="wastePercentage" step="0.01" type="number" defaultValue="0" required /></Field>
          <Field label="Prep minutes"><Input min="0" name="preparationTimeMinutes" type="number" /></Field>
          <Field label="Cook minutes"><Input min="0" name="cookingTimeMinutes" type="number" /></Field>
          <Field className="md:col-span-2" label="Description"><Input name="description" /></Field>
          <Field className="md:col-span-2" label="Preparation instructions"><Input name="preparationInstructions" /></Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-base font-medium">Components</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ingredient and sub-recipe costs are snapshotted when saved.
            </p>
          </div>
          <Button
            onClick={() => {
              setRows((current) => [...current, { key: nextKey, type: "INGREDIENT" }]);
              setNextKey((value) => value + 1);
            }}
            type="button"
            variant="outline"
          >
            <Plus /> Add row
          </Button>
        </div>
        <div className="divide-y">
          {rows.map((row, index) => {
            const options = row.type === "SUB_RECIPE" ? subRecipes : ingredients;
            return (
              <div className="grid gap-3 p-4 md:grid-cols-[160px_1fr_130px_150px_1fr_40px]" key={row.key}>
                <Select
                  aria-label={`Component type ${index + 1}`}
                  name="componentType"
                  onChange={(event) => {
                    const type = event.target.value;
                    setRows((current) => current.map((item) => item.key === row.key ? { ...item, type } : item));
                  }}
                  value={row.type}
                >
                  {ingredientTypes.map((type) => <option key={type}>{type}</option>)}
                  <option value="SUB_RECIPE">SUB RECIPE</option>
                </Select>
                <Select aria-label={`Component ${index + 1}`} name="componentId" required>
                  <option value="">Select component</option>
                  {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </Select>
                <Input aria-label={`Quantity ${index + 1}`} min="0.000001" name="componentQuantity" placeholder="Qty" step="any" type="number" required />
                <Select aria-label={`Unit ${index + 1}`} name="componentUnit">
                  {units.map((unit) => <option key={unit}>{unit}</option>)}
                </Select>
                <Input aria-label={`Preparation note ${index + 1}`} name="preparationNote" placeholder="Prep note" />
                <Button
                  aria-label={`Remove component ${index + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      </section>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">Costs will be shown in {currency}.</p>
        <SubmitButton pendingLabel="Calculating recipe…">Save recipe</SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
