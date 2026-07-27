import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getVerifiedMembership();
  const { id } = await params;
  const purchase = await prisma.purchase.findFirst({ where: { id, restaurantId: membership.restaurantId, deletedAt: null }, include: { supplier: true, branch: true, items: { include: { ingredient: { select: { name: true, baseUnit: true } } } } } });
  if (!purchase) notFound();
  return <main className="min-h-screen"><PageHeader action={<Button asChild variant="outline"><a href="/purchases"><ArrowLeft />Purchases</a></Button>} eyebrow="Purchases / Invoice" icon={Receipt} title={purchase.invoiceNumber ?? purchase.id.slice(-8)} /><div className="mx-auto grid max-w-[1400px] gap-5 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_340px]"><Card><CardHeader className="border-b"><CardTitle>Invoice items</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Ingredient</th><th className="px-4 py-3">Purchased</th><th className="px-4 py-3">Base quantity</th><th className="px-4 py-3">Unit price</th><th className="px-4 py-3 text-right">Line total</th></tr></thead><tbody className="divide-y">{purchase.items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.ingredient.name}</td><td className="px-4 py-3 tabular-nums">{item.purchasedQuantity.toFixed(3)} {item.purchaseUnit.toLowerCase()}</td><td className="px-4 py-3 tabular-nums">{item.convertedBaseQuantity.toFixed(3)} {item.ingredient.baseUnit.toLowerCase()}</td><td className="px-4 py-3 tabular-nums">{formatMoney(item.unitPrice.toNumber(), purchase.currency)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(item.lineTotal.toNumber(), purchase.currency)}</td></tr>)}</tbody></table></div></CardContent></Card><Card><CardHeader className="flex-row items-center justify-between border-b"><CardTitle>Purchase summary</CardTitle><Badge variant={purchase.paymentStatus === "PAID" ? "default" : "warning"}>{purchase.paymentStatus.replaceAll("_", " ")}</Badge></CardHeader><CardContent className="space-y-4 pt-5"><Detail label="Supplier" value={purchase.supplier.name} /><Detail label="Branch" value={purchase.branch.name} /><Detail label="Date" value={format(purchase.purchaseDate, "MMM d, yyyy")} /><Detail label="Subtotal" value={formatMoney(purchase.subtotal.toNumber(), purchase.currency)} /><Detail label="Discount" value={formatMoney(purchase.discount.toNumber(), purchase.currency)} /><Detail label="Tax" value={formatMoney(purchase.tax.toNumber(), purchase.currency)} /><Detail label="Delivery" value={formatMoney(purchase.deliveryCharge.toNumber(), purchase.currency)} /><div className="border-t pt-4"><Detail label="Total" value={formatMoney(purchase.total.toNumber(), purchase.currency)} /></div></CardContent></Card></div></main>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right text-sm font-medium tabular-nums">{value}</span></div>; }
