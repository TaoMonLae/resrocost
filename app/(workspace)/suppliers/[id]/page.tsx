import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const supplier = await prisma.supplier.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null }, include: { ingredients: { where: { deletedAt: null }, orderBy: { name: "asc" } }, purchases: { where: { deletedAt: null }, orderBy: { purchaseDate: "desc" }, take: 30 } } });
  if (!supplier) notFound();
  const spend = supplier.purchases.reduce((sum, purchase) => sum + purchase.total.toNumber(), 0);
  return <main className="min-h-screen"><PageHeader action={<Button asChild variant="outline"><a href="/suppliers"><ArrowLeft />Suppliers</a></Button>} eyebrow="Suppliers / Detail" icon={Truck} title={supplier.name} /><div className="mx-auto grid max-w-[1400px] gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_340px]"><Card><CardHeader className="border-b"><CardTitle>Purchase history</CardTitle></CardHeader><CardContent className="p-0"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y">{supplier.purchases.map((purchase) => <tr key={purchase.id}><td className="px-4 py-3">{format(purchase.purchaseDate, "MMM d, yyyy")}</td><td className="px-4 py-3">{purchase.invoiceNumber ?? "—"}</td><td className="px-4 py-3">{purchase.paymentStatus.replaceAll("_", " ")}</td><td className="px-4 py-3 text-right tabular-nums">{formatMoney(purchase.total.toNumber(), membership.restaurant.currency)}</td></tr>)}</tbody></table></CardContent></Card><div className="space-y-5"><Card><CardContent className="space-y-4 p-5"><Detail label="Contact" value={supplier.contactPerson ?? "Not set"} /><Detail label="Email" value={supplier.email ?? "Not set"} /><Detail label="Phone" value={supplier.phone ?? "Not set"} /><Detail label="Payment terms" value={supplier.paymentTerms ?? "Not set"} /><Detail label="Total spend" value={formatMoney(spend, membership.restaurant.currency)} /></CardContent></Card><Card><CardHeader className="border-b"><CardTitle>Ingredients supplied</CardTitle></CardHeader><CardContent className="p-0"><ul className="divide-y">{supplier.ingredients.map((ingredient) => <li className="px-4 py-3 text-sm" key={ingredient.id}>{ingredient.name}</li>)}</ul></CardContent></Card></div></div></main>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right text-sm">{value}</span></div>; }
