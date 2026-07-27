# Actual operating records

## Sales

Posting a sale is a single database transaction. RestroCost:

1. Resolves the tenant-owned branch, channel, menu items, and channel prices.
2. Allocates the order discount proportionally across item gross sales.
3. Stores selling price, food cost, full cost, channel fees, profit, and margin
   on each sale line.
4. Expands recipes and nested sub-recipes to base ingredients.
5. Validates negative-stock policy, updates ingredient balances, and appends
   inventory movements.

Later recipe, cost, price, or channel changes do not alter the sale snapshots.
An order reference is unique within a restaurant when supplied.

## Expenses

Expenses are classified as fixed or variable and one-time or recurring. Each
record belongs to a tenant-owned branch and category, with an optional supplier
and tax amount. Financial reporting uses the dated records rather than current
supplier settings.

## Waste

Waste can be recorded against an ingredient, prepared recipe, or menu item.
The cost is snapshotted at recording time. Ingredient waste also deducts the
converted base quantity from stock and appends an immutable waste transaction.
Prepared recipe and menu-item waste is costed without double-deducting raw
stock that may already have been consumed during production or sale.
