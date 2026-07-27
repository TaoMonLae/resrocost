import { ArrowLeft, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseForm } from "@/components/supply/purchase-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getVerifiedMembership } from "@/lib/tenant";

export default async function NewPurchasePage() {
  const membership = await getVerifiedMembership();
  const [suppliers, branches, ingredients] = await Promise.all([
    prisma.supplier.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.ingredient.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, purchaseUnit: true } }),
  ]);
  return <main className="min-h-screen"><PageHeader action={<Button asChild variant="outline"><a href="/purchases"><ArrowLeft />Purchases</a></Button>} description="Saving creates an immutable invoice snapshot and inventory transactions." eyebrow="Purchases / New" icon={Receipt} title="Record purchase" /><div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8"><PurchaseForm branches={branches} currency={membership.restaurant.currency} ingredients={ingredients} suppliers={suppliers} /></div></main>;
}
