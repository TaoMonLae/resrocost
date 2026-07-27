"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createSaleAction } from "@/app/actions/operations";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  channelPrices: { salesChannelId: string; customerPrice: number }[];
};

export function SaleForm({
  branches,
  channels,
  menuItems,
  currency,
}: {
  branches: { id: string; name: string }[];
  channels: { id: string; name: string }[];
  menuItems: MenuItem[];
  currency: string;
}) {
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [rows, setRows] = useState([{ key: 1, menuItemId: "", quantity: 1 }]);
  const [nextKey, setNextKey] = useState(2);
  const subtotal = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const item = menuItems.find((candidate) => candidate.id === row.menuItemId);
        const price =
          item?.channelPrices.find((entry) => entry.salesChannelId === channelId)
            ?.customerPrice ?? item?.price ?? 0;
        return sum + price * row.quantity;
      }, 0),
    [channelId, menuItems, rows],
  );

  return (
    <form action={createSaleAction} className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Branch"><Select name="branchId" required>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
          <Field label="Sales channel"><Select name="salesChannelId" onChange={(event) => setChannelId(event.target.value)} required value={channelId}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</Select></Field>
          <Field label="Sold at"><Input defaultValue={new Date().toISOString().slice(0, 16)} name="soldAt" type="datetime-local" required /></Field>
          <Field label="Order reference"><Input name="orderReference" /></Field>
          <Field label="Customer count"><Input defaultValue="1" min="1" name="customerCount" type="number" required /></Field>
          <Field label="Payment method"><Input name="paymentMethod" placeholder="Cash, card…" /></Field>
          <Field label="Discount"><Input defaultValue="0" min="0" name="discount" step="0.01" type="number" required /></Field>
          <Field label="Tax"><Input defaultValue="0" min="0" name="tax" step="0.01" type="number" required /></Field>
          <Field label="Service charge"><Input defaultValue="0" min="0" name="serviceCharge" step="0.01" type="number" required /></Field>
          <Field label="Notes"><Input name="notes" /></Field>
        </div>
      </section>
      <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="font-medium">Sale items</h2><p className="mt-1 text-xs text-muted-foreground">Configured channel prices take precedence over base prices.</p></div>
          <Button onClick={() => { setRows((value) => [...value, { key: nextKey, menuItemId: "", quantity: 1 }]); setNextKey((value) => value + 1); }} type="button" variant="outline"><Plus />Add item</Button>
        </div>
        <div className="divide-y">
          {rows.map((row, index) => (
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_150px_140px_40px]" key={row.key}>
              <Select aria-label={`Menu item ${index + 1}`} name="menuItemId" onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, menuItemId: event.target.value } : item))} required value={row.menuItemId}><option value="">Select menu item</option>{menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Input aria-label={`Quantity ${index + 1}`} min="0.01" name="quantity" onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, quantity: Number(event.target.value) } : item))} step="any" type="number" value={row.quantity} required />
              <div className="rounded-md bg-muted px-3 py-2 text-right text-sm tabular-nums">{formatMoney(lineTotal(row.menuItemId, row.quantity, channelId, menuItems), currency)}</div>
              <Button aria-label={`Remove item ${index + 1}`} disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} size="icon" type="button" variant="ghost"><Trash2 /></Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 p-5"><p className="text-sm text-muted-foreground">Estimated subtotal</p><p className="text-xl font-medium tabular-nums">{formatMoney(subtotal, currency)}</p></div>
      </section>
      <div className="flex justify-end"><SubmitButton pendingLabel="Posting sale…">Post sale</SubmitButton></div>
    </form>
  );
}

function lineTotal(menuItemId: string, quantity: number, channelId: string, menuItems: MenuItem[]) {
  const item = menuItems.find((candidate) => candidate.id === menuItemId);
  const price = item?.channelPrices.find((entry) => entry.salesChannelId === channelId)?.customerPrice ?? item?.price ?? 0;
  return price * quantity;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="mb-2 block">{label}</Label>{children}</div>; }
