import Link from "next/link";
import { Truck, UserPlus } from "lucide-react";
import { createSupplierAction } from "@/app/actions/supply";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function SuppliersPage() {
  const membership = await getVerifiedMembership();
  const suppliers = await prisma.supplier.findMany({
    where: { restaurantId: membership.restaurantId, deletedAt: null },
    include: { _count: { select: { ingredients: true, purchases: true } }, purchases: { select: { total: true, purchaseDate: true }, orderBy: { purchaseDate: "desc" } } },
    orderBy: { name: "asc" },
  });
  const totalSpend = suppliers.reduce((sum, supplier) => sum + supplier.purchases.reduce((value, purchase) => value + purchase.total.toNumber(), 0), 0);

  return (
    <main className="min-h-screen">
      <PageHeader action={<Button asChild><a href="#new-supplier"><UserPlus />Add supplier</a></Button>} description="Manage purchasing partners and price performance." eyebrow="Cost control" icon={Truck} title="Suppliers" />
      <div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-3"><Summary label="Active suppliers" value={String(suppliers.filter((s) => s.active).length)} /><Summary label="Purchase records" value={String(suppliers.reduce((sum, s) => sum + s._count.purchases, 0))} /><Summary label="Total recorded spend" value={formatMoney(totalSpend, membership.restaurant.currency)} /></section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => {
            const spend = supplier.purchases.reduce((sum, purchase) => sum + purchase.total.toNumber(), 0);
            return <Link className="rounded-xl border bg-card p-5 shadow-[var(--shadow)] transition-colors hover:bg-muted/40" href={`/suppliers/${supplier.id}`} key={supplier.id}><div className="flex items-start justify-between"><div><h2 className="font-medium">{supplier.name}</h2><p className="mt-1 text-xs text-muted-foreground">{supplier.contactPerson ?? "No contact person"}</p></div><Badge variant={supplier.active ? "default" : "neutral"}>{supplier.active ? "Active" : "Inactive"}</Badge></div><div className="mt-6 grid grid-cols-3 gap-3 border-t pt-4"><Metric label="Ingredients" value={String(supplier._count.ingredients)} /><Metric label="Purchases" value={String(supplier._count.purchases)} /><Metric label="Spend" value={formatMoney(spend, membership.restaurant.currency)} /></div></Link>;
          })}
        </section>
        <Card className="scroll-mt-28" id="new-supplier"><CardContent className="p-5"><h2 className="text-base font-medium">Add supplier</h2><p className="mt-1 text-xs text-muted-foreground">Store contact and payment details for purchase entry.</p><form action={createSupplierAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Supplier name"><Input name="name" required /></Field><Field label="Contact person"><Input name="contactPerson" /></Field><Field label="Phone"><Input name="phone" /></Field><Field label="Email"><Input name="email" type="email" /></Field><Field className="sm:col-span-2" label="Address"><Input name="address" /></Field><Field label="Tax number"><Input name="taxNumber" /></Field><Field label="Payment terms"><Input name="paymentTerms" placeholder="Net 30" /></Field><Field className="sm:col-span-2 lg:col-span-3" label="Notes"><Input name="notes" /></Field><div className="flex items-end justify-end"><SubmitButton pendingLabel="Adding supplier…">Add supplier</SubmitButton></div></form></CardContent></Card>
      </div>
    </main>
  );
}
function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-medium">{value}</p></CardContent></Card>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium tabular-nums">{value}</p></div>; }
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-2 block text-xs">{label}</Label>{children}</div>; }
