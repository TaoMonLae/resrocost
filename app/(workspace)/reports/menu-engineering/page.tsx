import { Grid2X2 } from "lucide-react";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { classifyMenuItem } from "@/lib/services/reporting-service";
import { getVerifiedMembership } from "@/lib/tenant";
import { formatMoney } from "@/lib/utils";

const variant = { STAR: "default", PLOWHORSE: "info", PUZZLE: "warning", DOG: "critical", UNCLASSIFIED: "neutral" } as const;
const guidance = {
  STAR: "Protect quality and visibility.",
  PLOWHORSE: "Improve price or portion cost carefully.",
  PUZZLE: "Increase visibility and test positioning.",
  DOG: "Rework, reposition, or consider removal.",
  UNCLASSIFIED: "Collect more sales data.",
} as const;

export default async function MenuEngineeringPage() {
  const membership = await getVerifiedMembership();
  const items = await prisma.menuItem.findMany({
    where: { restaurantId: membership.restaurantId, active: true, deletedAt: null },
    include: { saleItems: { where: { sale: { deletedAt: null } }, select: { quantity: true, calculatedProfitSnapshot: true } } },
    orderBy: { name: "asc" },
  });
  const data = items.map((item) => {
    const quantity = item.saleItems.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    const contribution = item.saleItems.reduce((sum, line) => sum.plus(line.calculatedProfitSnapshot), new Prisma.Decimal(0));
    return { item, quantity, contribution, contributionPerUnit: quantity.gt(0) ? contribution.div(quantity) : new Prisma.Decimal(0) };
  });
  const averageQuantity = data.length ? data.reduce((sum, row) => sum.plus(row.quantity), new Prisma.Decimal(0)).div(data.length) : new Prisma.Decimal(0);
  const averageContribution = data.length ? data.reduce((sum, row) => sum.plus(row.contributionPerUnit), new Prisma.Decimal(0)).div(data.length) : new Prisma.Decimal(0);
  const rows = data.map((row) => ({ ...row, classification: row.quantity.gt(0) ? classifyMenuItem({ quantitySold: row.quantity, contributionPerUnit: row.contributionPerUnit, averageQuantitySold: averageQuantity, averageContributionPerUnit: averageContribution }) : "UNCLASSIFIED" as const }));
  return <main className="min-h-screen"><PageHeader description="Popularity and unit contribution compared with portfolio averages." eyebrow="Reports" icon={Grid2X2} title="Menu engineering" /><div className="mx-auto max-w-[1540px] space-y-5 px-5 py-7 sm:px-8"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["STAR", "PLOWHORSE", "PUZZLE", "DOG"] as const).map((group) => <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow)]" key={group}><Badge variant={variant[group]}>{group}</Badge><p className="mt-3 text-2xl font-medium">{rows.filter((row) => row.classification === group).length}</p><p className="mt-1 text-xs text-muted-foreground">{guidance[group]}</p></div>)}</section><section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Qty sold</th><th className="px-4 py-3">Contribution / unit</th><th className="px-4 py-3">Recommendation</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.item.id}><td className="px-4 py-3 font-medium">{row.item.name}</td><td className="px-4 py-3"><Badge variant={variant[row.classification]}>{row.classification}</Badge></td><td className="px-4 py-3">{row.quantity.toFixed(1)}</td><td className="px-4 py-3">{formatMoney(row.contributionPerUnit.toNumber(), membership.restaurant.currency)}</td><td className="px-4 py-3 text-muted-foreground">{guidance[row.classification]}</td></tr>)}{!rows.length && <tr><td className="px-4 py-14 text-center text-muted-foreground" colSpan={5}>Add menu items and sales to populate this matrix.</td></tr>}</tbody></table></div></section></div></main>;
}
