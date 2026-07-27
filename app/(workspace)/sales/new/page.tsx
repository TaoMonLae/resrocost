import { CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SaleForm } from "@/components/operations/sale-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";

export default async function NewSalePage() {
  const membership = await requirePermission("sales:write");
  const [branches, channels, items] = await Promise.all([
    prisma.branch.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.salesChannel.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.menuItem.findMany({ where: { restaurantId: membership.restaurantId, active: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, currentBaseSellingPrice: true, channelPrices: { where: { active: true }, select: { salesChannelId: true, customerPrice: true } } } }),
  ]);
  return <main className="min-h-screen"><PageHeader description="Post actual sales and deduct recipe ingredients in one transaction." eyebrow="Actual performance" icon={CircleDollarSign} title="Record sale" /><div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8"><SaleForm branches={branches} channels={channels} currency={membership.restaurant.currency} menuItems={items.map((item) => ({ id: item.id, name: item.name, price: item.currentBaseSellingPrice.toNumber(), channelPrices: item.channelPrices.map((price) => ({ salesChannelId: price.salesChannelId, customerPrice: price.customerPrice.toNumber() })) }))} /></div></main>;
}
