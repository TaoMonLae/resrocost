# Calculation methodology

Financial calculations use decimal arithmetic. Floating-point numbers are not
stored as authoritative monetary values.

## Base-unit ingredient cost

```text
cost used =
  purchase price
  ÷ converted purchase quantity
  × recipe base quantity
```

When an ingredient has waste:

```text
usable quantity = purchase quantity × (1 - waste percentage)
effective unit cost = purchase price ÷ usable quantity
```

## Recipe and full item cost

```text
recipe batch cost =
  sum(ingredient and sub-recipe costs)
  + recipe waste allowance
  + direct batch costs

cost per serving = recipe batch cost ÷ recipe servings

full item cost =
  food cost
  + packaging
  + direct labor
  + utilities
  + waste
  + other variable costs
  + allocated overhead
```

Circular sub-recipe dependencies must be rejected before saving.

## Pricing and profit

```text
food-cost target price = food cost ÷ target food-cost percentage
margin target price = full cost ÷ (1 - target profit margin)
```

A target margin of 100% or more is invalid.

```text
profit margin = profit ÷ selling price × 100
markup = profit ÷ cost × 100
```

Margin and markup are different measures and must be labelled separately.

## Channel pricing

```text
required channel price =
  (required net revenue + fixed fees)
  ÷ (1 - commission rate - percentage fees)
```

## Break-even

```text
contribution per item = selling price - variable cost
break-even units = monthly fixed costs ÷ contribution per item
break-even revenue = monthly fixed costs ÷ contribution margin ratio
```

Break-even units are undefined when contribution is zero or negative; the
interface must show a warning instead.

## Historical integrity

Purchase items save purchase unit, conversion factor, base quantity, and unit
cost. Sale items save selling price, food cost, full cost, channel fees, profit,
and margin. Historical reports read those snapshots and never recalculate old
sales with current ingredient prices.
