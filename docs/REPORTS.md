# Reports and alerts

All reports are tenant-scoped and use actual records. No sample points are
inserted when a restaurant has no data.

## Dashboard

The dashboard shows month-to-date revenue, cost, contribution, estimated net
profit, targets, inventory value, break-even progress, and a daily revenue and
profit chart. Historical sales values come from immutable sale snapshots.

## Profitability

The profitability report groups sale lines by menu item and totals quantity,
net revenue, food cost, full cost, channel fees, profit, and margin.

## Menu engineering

Menu items are split against portfolio averages:

| Demand | Contribution | Classification |
| --- | --- | --- |
| High | High | Star |
| High | Low | Plowhorse |
| Low | High | Puzzle |
| Low | Low | Dog |

Items without sales remain unclassified rather than being assigned a misleading
quadrant.

## Break-even

Contribution margin is revenue less immutable sale costs. The fixed-cost
baseline is the higher of recorded fixed expenses and the configured monthly
baseline.

```text
break-even revenue = fixed costs / contribution margin ratio
break-even units = fixed costs / contribution per unit
margin of safety = (actual revenue - break-even revenue) / actual revenue
```

## Alerts

Refreshing alerts evaluates low stock, missing ingredient prices, low-margin
items, and loss-making items. Resolved alerts remain historical; a still-active
condition can create a new open alert on the next refresh.
