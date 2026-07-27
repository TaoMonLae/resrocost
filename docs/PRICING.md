# Recipe and pricing methodology

## Recipe costs

Recipe components may reference an ingredient or an existing sub-recipe.
Ingredient quantities are converted to the ingredient base unit. Sub-recipe
quantities are converted to that recipe's batch-yield unit.

Direct batch cost is the sum of converted component quantity multiplied by its
current unit cost. Recipe waste is then applied:

```text
batch cost = direct batch cost / (1 - waste percentage)
cost per serving = batch cost / number of servings
```

Each saved recipe gets a version snapshot. Component cost snapshots preserve
the assumptions used at creation time. Circular sub-recipe graphs are rejected.

## Menu item economics

Food cost is recipe cost per serving multiplied by the serving multiplier.
Full cost adds packaging, direct labour, utilities, other variable costs, and
allocated overhead.

```text
profit = selling price - full cost
profit margin = profit / selling price
food-cost target price = food cost / target food-cost percentage
margin target price = full cost / (1 - target profit margin)
```

Price changes are written to price history and the audit log.

## Sales channels

Each channel can include commission, payment processing, tax, a fixed
transaction fee, delivery subsidy, discount contribution, and a packaging
surcharge. Channel profit is based on net revenue after those deductions, not
the headline customer price. Each menu item can have a distinct customer price
for every channel.
