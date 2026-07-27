import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  PackageSearch,
  PiggyBank,
  ReceiptText,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import {
  refreshAlertsAction,
  resolveAlertAction,
} from "@/app/actions/alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceChart } from "@/components/reports/performance-chart";
import { getDashboardSummary } from "@/lib/dashboard";
import { getVerifiedMembership } from "@/lib/tenant";
import { cn, formatMoney, formatPercent } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const membership = await getVerifiedMembership();
  const summary = await getDashboardSummary(membership.restaurantId);
  const { metrics, currency } = summary;
  const hasTradingData =
    !metrics.totalSales.isZero() ||
    !metrics.ingredientSpend.isZero() ||
    !metrics.inventoryValue.isZero();

  const metricCards = [
    {
      label: "Total sales",
      value: formatMoney(metrics.totalSales.toNumber(), currency),
      helper: "Month to date",
      icon: CircleDollarSign,
      tone: "forest",
    },
    {
      label: "Ingredient spend",
      value: formatMoney(metrics.ingredientSpend.toNumber(), currency),
      helper: "Completed purchases",
      icon: ReceiptText,
      tone: "neutral",
    },
    {
      label: "Variable cost",
      value: formatMoney(metrics.variableCost.toNumber(), currency),
      helper: "Historical sale snapshots",
      icon: Scale,
      tone: "neutral",
    },
    {
      label: "Gross profit",
      value: formatMoney(metrics.grossProfit.toNumber(), currency),
      helper: "Sales less variable cost",
      icon: TrendingUp,
      tone: metrics.grossProfit.isNegative() ? "coral" : "forest",
    },
    {
      label: "Estimated net profit",
      value: formatMoney(metrics.estimatedNetProfit.toNumber(), currency),
      helper: "After fixed expenses",
      icon: PiggyBank,
      tone: metrics.estimatedNetProfit.isNegative() ? "coral" : "forest",
    },
    {
      label: "Average food cost",
      value: formatPercent(metrics.averageFoodCostPercentage.toNumber()),
      helper: `Target ${formatPercent(summary.targets.foodCostPercentage.toNumber())}`,
      icon: WalletCards,
      tone:
        metrics.averageFoodCostPercentage.greaterThan(
          summary.targets.foodCostPercentage,
        )
          ? "amber"
          : "neutral",
    },
    {
      label: "Average profit margin",
      value: formatPercent(metrics.averageProfitMargin.toNumber()),
      helper: `Target ${formatPercent(summary.targets.profitMargin.toNumber())}`,
      icon: Target,
      tone:
        metrics.averageProfitMargin.lessThan(summary.targets.profitMargin)
          ? "amber"
          : "neutral",
    },
    {
      label: "Monthly fixed expenses",
      value: formatMoney(metrics.fixedExpenses.toNumber(), currency),
      helper: "Recorded or configured baseline",
      icon: CalendarDays,
      tone: "neutral",
    },
    {
      label: "Break-even progress",
      value: formatPercent(metrics.breakEvenProgress.toNumber(), 0),
      helper: metrics.fixedExpenses.isZero()
        ? "No fixed-cost baseline"
        : "Contribution toward fixed costs",
      icon: Sparkles,
      tone: "forest",
    },
    {
      label: "Inventory value",
      value: formatMoney(metrics.inventoryValue.toNumber(), currency),
      helper: "Current stock × weighted cost",
      icon: Boxes,
      tone: "neutral",
    },
  ] as const;

  return (
    <main className="min-h-screen">
      <header className="sticky top-16 z-30 border-b bg-card/95 backdrop-blur lg:top-0">
        <div className="flex min-h-[72px] items-center justify-between gap-4 px-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Overview</span>
              <span aria-hidden="true">/</span>
              <span>Dashboard</span>
            </div>
            <h1 className="mt-1 text-xl font-medium tracking-[-0.025em]">
              Restaurant performance
            </h1>
          </div>
          <Button className="shrink-0" variant="outline">
            <CalendarDays />
            <span className="hidden sm:inline">
              {format(summary.period.from, "MMM d")} –{" "}
              {format(summary.period.to, "MMM d, yyyy")}
            </span>
            <span className="sm:hidden">This month</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 sm:py-9">
        <section className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Badge variant="default">Live database</Badge>
            <h2 className="mt-3 text-2xl font-normal tracking-[-0.03em] sm:text-3xl">
              This month at a glance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every value below is calculated from restaurant-scoped records.
              Historical sales use saved cost snapshots rather than today’s
              ingredient prices.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-[var(--forest)]" />
            Updated from current ledger
          </div>
        </section>

        <section
          aria-label="Performance summary"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        >
          {metricCards.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Operating signal</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sales, costs, and contribution health
                </p>
              </div>
              <Badge variant={hasTradingData ? "default" : "neutral"}>
                {hasTradingData ? "Tracking" : "Awaiting data"}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {hasTradingData ? (
                <PerformanceChart currency={currency} data={summary.trend} />
              ) : (
                <EmptyDashboardState />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Needs attention</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open margin and inventory alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={summary.alerts.length ? "warning" : "neutral"}>
                  {summary.alerts.length} open
                </Badge>
                <form action={refreshAlertsAction}>
                  <Button size="sm" type="submit" variant="ghost">Refresh</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {summary.alerts.length ? (
                <ul className="divide-y">
                  {summary.alerts.map((alert) => (
                    <li className="flex gap-3 p-4" key={alert.id}>
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
                          alert.severity === "CRITICAL" &&
                            "bg-[var(--coral-soft)] text-[var(--coral)]",
                          alert.severity === "WARNING" &&
                            "bg-[var(--amber-soft)] text-[var(--amber)]",
                          alert.severity === "INFO" &&
                            "bg-[var(--blue-soft)] text-[var(--blue)]",
                        )}
                      >
                        <AlertTriangle className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {alert.description}
                        </p>
                        <form action={resolveAlertAction} className="mt-2">
                          <input name="alertId" type="hidden" value={alert.id} />
                          <button className="text-[11px] font-medium text-[var(--forest)] hover:underline" type="submit">
                            Resolve
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid min-h-[260px] place-items-center p-8 text-center">
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--forest-soft)] text-[var(--forest)]">
                      <Sparkles className="size-5" />
                    </span>
                    <p className="mt-4 text-sm font-medium">All clear</p>
                    <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                      Alerts will appear here as purchases, stock, recipes, and
                      menu margins start moving.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "forest" | "coral" | "amber" | "neutral";
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-md",
              tone === "forest" &&
                "bg-[var(--forest-soft)] text-[var(--forest)]",
              tone === "coral" &&
                "bg-[var(--coral-soft)] text-[var(--coral)]",
              tone === "amber" &&
                "bg-[var(--amber-soft)] text-[var(--amber)]",
              tone === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        </div>
        <p className="mt-4 truncate text-xl font-medium tracking-[-0.025em] tabular-nums">
          {value}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {tone === "forest" && <ArrowUpRight className="size-3" />}
          {tone === "coral" && <ArrowDownRight className="size-3" />}
          <span className="truncate">{helper}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyDashboardState() {
  return (
    <div className="grid min-h-[260px] place-items-center p-8">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--surface-soft)] text-muted-foreground">
          <PackageSearch className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-medium">Your operating view is ready</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Add ingredients, recipes, menu items, and a sale. This dashboard
          reads the resulting ledger directly—there are no fabricated
          performance numbers.
        </p>
        <Button asChild className="mt-5" variant="outline">
          <a href="/sales/new">Record a sale <ArrowUpRight /></a>
        </Button>
      </div>
    </div>
  );
}
