import { Store } from "lucide-react";
import { createSalesChannelAction } from "@/app/actions/menu";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney, formatPercent } from "@/lib/utils";

const channelTypes = ["DINE_IN", "TAKEAWAY", "GRABFOOD", "FOODPANDA", "SHOPEEFOOD", "CATERING", "WHOLESALE", "CUSTOM"] as const;

export default async function SalesChannelsPage() {
  const membership = await getVerifiedMembership();
  const channels = await prisma.salesChannel.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: { _count: { select: { menuItemPrices: true, sales: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <main className="min-h-screen">
      <PageHeader action={<a className="text-sm font-medium text-[var(--forest)] hover:underline" href="#new-channel">Add channel</a>} description="Model commissions, processing, tax, and delivery deductions." eyebrow="Channel economics" icon={Store} title="Sales channels" />
      <div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => {
            const percentageFees = channel.commissionPercentage.plus(channel.paymentProcessingPercentage).plus(channel.taxPercentage);
            return <Card key={channel.id}><CardContent className="p-5"><div className="flex justify-between gap-3"><div><h2 className="font-medium">{channel.name}</h2><p className="mt-1 text-xs text-muted-foreground">{channel.type.replaceAll("_", " ")}</p></div><Badge variant={channel.active ? "default" : "neutral"}>{channel.active ? "Active" : "Paused"}</Badge></div><div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm"><Stat label="Percentage fees" value={formatPercent(percentageFees.toNumber())} /><Stat label="Fixed fee" value={formatMoney(channel.fixedTransactionFee.toNumber(), membership.restaurant.currency)} /><Stat label="Configured items" value={String(channel._count.menuItemPrices)} /><Stat label="Recorded sales" value={String(channel._count.sales)} /></div></CardContent></Card>;
          })}
        </section>
        <section className="scroll-mt-28 rounded-xl border bg-card p-5 shadow-[var(--shadow)]" id="new-channel">
          <h2 className="text-base font-medium">Add sales channel</h2>
          <p className="mt-1 text-xs text-muted-foreground">All deductions are evaluated per item at its customer-facing price.</p>
          <form action={createSalesChannelAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Type"><Select name="type">{channelTypes.map((type) => <option key={type}>{type}</option>)}</Select></Field>
            <PercentField label="Commission %" name="commissionPercentage" />
            <MoneyField label="Fixed transaction fee" name="fixedTransactionFee" />
            <PercentField label="Payment processing %" name="paymentProcessingPercentage" />
            <PercentField label="Tax %" name="taxPercentage" />
            <MoneyField label="Packaging surcharge" name="packagingSurcharge" />
            <MoneyField label="Delivery subsidy" name="deliverySubsidy" />
            <MoneyField label="Discount contribution" name="discountContribution" />
            <div className="flex items-end lg:col-span-3 lg:justify-end"><SubmitButton>Add channel</SubmitButton></div>
          </form>
        </section>
      </div>
    </main>
  );
}
function PercentField({ label, name }: { label: string; name: string }) { return <Field label={label}><Input defaultValue="0" max="100" min="0" name={name} step="0.01" type="number" required /></Field>; }
function MoneyField({ label, name }: { label: string; name: string }) { return <Field label={label}><Input defaultValue="0" min="0" name={name} step="0.01" type="number" required /></Field>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="mb-2 block">{label}</Label>{children}</div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>; }
