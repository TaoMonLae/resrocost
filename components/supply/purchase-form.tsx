"use client";

import { useState } from "react";
import { Minus, Plus, ReceiptText } from "lucide-react";
import { createPurchaseAction } from "@/app/actions/supply";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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

type Option = { id: string; name: string };
type IngredientOption = Option & { purchaseUnit: string };

export function PurchaseForm({
  suppliers,
  branches,
  ingredients,
  currency,
}: {
  suppliers: Option[];
  branches: Option[];
  ingredients: IngredientOption[];
  currency: string;
}) {
  const [rowCount, setRowCount] = useState(1);

  return (
    <form action={createPurchaseAction} className="space-y-6">
      <section className="grid gap-5 rounded-xl border bg-card p-5 shadow-[var(--shadow)] md:grid-cols-2 xl:grid-cols-4">
        <Field label="Supplier">
          <Select name="supplierId" required>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch">
          <Select name="branchId" required>
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purchase date">
          <Input
            defaultValue={new Date().toISOString().slice(0, 10)}
            name="purchaseDate"
            required
            type="date"
          />
        </Field>
        <Field label="Invoice number">
          <Input name="invoiceNumber" placeholder="INV-2026-001" />
        </Field>
        <input name="currency" type="hidden" value={currency} />
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-medium">Purchase items</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Quantities are converted to each ingredient’s base unit.
            </p>
          </div>
          <Button
            disabled={rowCount >= 8}
            onClick={() => setRowCount((value) => value + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus />
            Add row
          </Button>
        </div>
        <div className="divide-y">
          {Array.from({ length: rowCount }).map((_, index) => (
            <div
              className="grid gap-3 p-4 md:grid-cols-[2fr_0.8fr_1fr_1fr_1fr_1fr_auto]"
              key={index}
            >
              <Field label={index === 0 ? "Ingredient" : undefined}>
                <Select name="ingredientId" required>
                  <option value="">Select ingredient</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={index === 0 ? "Qty" : undefined}>
                <Input
                  min="0.000001"
                  name="quantity"
                  required
                  step="0.000001"
                  type="number"
                />
              </Field>
              <Field label={index === 0 ? "Unit" : undefined}>
                <Select name="purchaseUnit" required>
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit.toLowerCase()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={index === 0 ? "Unit price" : undefined}>
                <Input
                  min="0"
                  name="unitPrice"
                  required
                  step="0.0001"
                  type="number"
                />
              </Field>
              <Field label={index === 0 ? "Batch" : undefined}>
                <Input name="batchNumber" placeholder="Optional" />
              </Field>
              <Field label={index === 0 ? "Expiry" : undefined}>
                <Input name="expiryDate" type="date" />
              </Field>
              <div className={index === 0 ? "pt-6" : ""}>
                <Button
                  aria-label={`Remove row ${index + 1}`}
                  disabled={rowCount === 1}
                  onClick={() => setRowCount((value) => value - 1)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Minus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border bg-card p-5 shadow-[var(--shadow)] sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Discount">
          <Input defaultValue="0" min="0" name="discount" step="0.01" type="number" />
        </Field>
        <Field label="Tax">
          <Input defaultValue="0" min="0" name="tax" step="0.01" type="number" />
        </Field>
        <Field label="Delivery charge">
          <Input
            defaultValue="0"
            min="0"
            name="deliveryCharge"
            step="0.01"
            type="number"
          />
        </Field>
        <Field label="Payment status">
          <Select defaultValue="PENDING" name="paymentStatus">
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </Select>
        </Field>
        <Field label="Payment method">
          <Input name="paymentMethod" placeholder="Bank transfer" />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-3" label="Notes">
          <Input name="notes" placeholder="Receiving notes or invoice comments" />
        </Field>
      </section>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Recording purchase…">
          <ReceiptText />
          Record purchase
        </SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {label && <Label className="mb-2 block text-xs">{label}</Label>}
      {children}
    </div>
  );
}
