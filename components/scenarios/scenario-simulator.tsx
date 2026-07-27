"use client";

import { useMemo, useState } from "react";
import { saveScenarioAction } from "@/app/actions/scenarios";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { simulateMenuScenario } from "@/lib/services/scenario-service";
import { formatMoney, formatPercent } from "@/lib/utils";

type Item = { id: string; name: string; foodCost: number; fullCost: number; price: number };
const initialInputs = {
  ingredientPriceChangePercentage: 0,
  portionSizeChangePercentage: 0,
  sellingPriceChangePercentage: 0,
  commissionPercentage: 0,
  wastePercentageChange: 0,
  laborCostChange: 0,
  monthlySalesVolume: 500,
  fixedExpenses: 3000,
};

export function ScenarioSimulator({ items, currency }: { items: Item[]; currency: string }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [inputs, setInputs] = useState(initialInputs);
  const item = items.find((entry) => entry.id === itemId);
  const result = useMemo(() => item ? simulateMenuScenario({
    currentFoodCost: item.foodCost,
    currentFullCost: item.fullCost,
    sellingPrice: item.price,
    ...inputs,
  }) : null, [inputs, item]);
  const set = (key: keyof typeof inputs, value: number) =>
    setInputs((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card><CardHeader><CardTitle>Scenario inputs</CardTitle></CardHeader><CardContent>
        <form action={saveScenarioAction} className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Menu item"><Select name="menuItemId" onChange={(event) => setItemId(event.target.value)} value={itemId} required>{items.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field>
          <Field label="Ingredient prices %"><NumberInput name="ingredientPriceChangePercentage" value={inputs.ingredientPriceChangePercentage} onChange={(value) => set("ingredientPriceChangePercentage", value)} /></Field>
          <Field label="Portion size %"><NumberInput name="portionSizeChangePercentage" value={inputs.portionSizeChangePercentage} onChange={(value) => set("portionSizeChangePercentage", value)} /></Field>
          <Field label="Selling price %"><NumberInput name="sellingPriceChangePercentage" value={inputs.sellingPriceChangePercentage} onChange={(value) => set("sellingPriceChangePercentage", value)} /></Field>
          <Field label="Platform commission %"><NumberInput min={0} max={99.99} name="commissionPercentage" value={inputs.commissionPercentage} onChange={(value) => set("commissionPercentage", value)} /></Field>
          <Field label="Waste impact %"><NumberInput name="wastePercentageChange" value={inputs.wastePercentageChange} onChange={(value) => set("wastePercentageChange", value)} /></Field>
          <Field label="Labour cost change"><NumberInput name="laborCostChange" value={inputs.laborCostChange} onChange={(value) => set("laborCostChange", value)} /></Field>
          <Field label="Monthly sales volume"><NumberInput min={0} name="monthlySalesVolume" value={inputs.monthlySalesVolume} onChange={(value) => set("monthlySalesVolume", value)} /></Field>
          <Field label="Monthly fixed expenses"><NumberInput min={0} name="fixedExpenses" value={inputs.fixedExpenses} onChange={(value) => set("fixedExpenses", value)} /></Field>
          <Field label="Scenario name"><Input name="name" placeholder="Supplier increase + delivery" required /></Field>
          <Field label="Description"><Input name="description" /></Field>
          <div className="sm:col-span-2"><SubmitButton className="w-full" disabled={!item}>Save named scenario</SubmitButton></div>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Before and after</CardTitle></CardHeader><CardContent className="space-y-4">
        {item && result ? <>
          <Comparison label="Food cost" before={formatMoney(item.foodCost, currency)} after={formatMoney(result.adjustedFoodCost.toNumber(), currency)} />
          <Comparison label="Full cost" before={formatMoney(item.fullCost, currency)} after={formatMoney(result.adjustedFullCost.toNumber(), currency)} />
          <Comparison label="Selling price" before={formatMoney(item.price, currency)} after={formatMoney(result.adjustedPrice.toNumber(), currency)} />
          <Comparison label="Profit per sale" before={formatMoney(item.price - item.fullCost, currency)} after={formatMoney(result.profitPerSale.toNumber(), currency)} />
          <Comparison label="Profit margin" before={formatPercent(item.price ? (item.price - item.fullCost) / item.price * 100 : 0)} after={formatPercent(result.profitMargin.toNumber())} />
          <Comparison label="Monthly profit" before="—" after={formatMoney(result.monthlyProfit.toNumber(), currency)} />
          <Comparison label="Break-even units" before="—" after={result.breakEvenUnits?.toFixed(0) ?? "No positive contribution"} />
        </> : <p className="py-20 text-center text-sm text-muted-foreground">Create a menu item to run scenarios.</p>}
        <p className="border-t pt-4 text-xs leading-5 text-muted-foreground">Simulation reads live values but never writes to menu, recipe, inventory, or sales records.</p>
      </CardContent></Card>
    </div>
  );
}
function NumberInput({ name, value, onChange, min, max }: { name: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) { return <Input max={max} min={min} name={name} onChange={(event) => onChange(Number(event.target.value))} step="0.01" type="number" value={value} required />; }
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-2 block">{label}</Label>{children}</div>; }
function Comparison({ label, before, after }: { label: string; before: string; after: string }) { return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b pb-3 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{before}</span><span className="min-w-24 rounded-md bg-[var(--forest-soft)] px-2 py-1 text-right font-medium tabular-nums text-[var(--forest)]">{after}</span></div>; }
