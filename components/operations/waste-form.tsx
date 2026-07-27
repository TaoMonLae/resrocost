"use client";

import { useState } from "react";
import { createWasteAction } from "@/app/actions/operations";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const units = ["MILLIGRAM", "GRAM", "KILOGRAM", "MILLILITER", "LITER", "UNIT", "PIECE", "DOZEN", "TRAY", "BOX", "BAG", "PACK"] as const;
const reasons = ["EXPIRED", "SPOILED", "OVERPRODUCTION", "PREPARATION_WASTE", "INCORRECT_ORDER", "CUSTOMER_RETURN", "DAMAGED", "STOCK_COUNT_VARIANCE", "OTHER"] as const;

export function WasteForm({
  branches,
  ingredients,
  recipes,
  menuItems,
}: {
  branches: { id: string; name: string }[];
  ingredients: { id: string; name: string }[];
  recipes: { id: string; name: string }[];
  menuItems: { id: string; name: string }[];
}) {
  const [type, setType] = useState<"INGREDIENT" | "RECIPE" | "MENU_ITEM">("INGREDIENT");
  const options = type === "INGREDIENT" ? ingredients : type === "RECIPE" ? recipes : menuItems;
  return (
    <form action={createWasteAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Branch"><Select name="branchId" required>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
      <Field label="Waste source"><Select name="sourceType" onChange={(event) => setType(event.target.value as typeof type)} value={type}><option value="INGREDIENT">Ingredient</option><option value="RECIPE">Prepared recipe</option><option value="MENU_ITEM">Menu item</option></Select></Field>
      <Field label="Item"><Select key={type} name="sourceId" required><option value="">Select item</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Field>
      <Field label="Quantity"><Input min="0.000001" name="quantity" step="any" type="number" required /></Field>
      <Field label="Unit"><Select name="unit">{units.map((unit) => <option key={unit}>{unit}</option>)}</Select></Field>
      <Field label="Reason"><Select name="reason">{reasons.map((reason) => <option key={reason}>{reason.replaceAll("_", " ")}</option>)}</Select></Field>
      <Field label="Date"><Input defaultValue={new Date().toISOString().slice(0, 10)} name="wasteDate" type="date" required /></Field>
      <Field label="Notes"><Input name="notes" /></Field>
      <div className="flex justify-end sm:col-span-2 lg:col-span-4"><SubmitButton pendingLabel="Recording waste…">Record waste</SubmitButton></div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="mb-2 block">{label}</Label>{children}</div>; }
