# Inventory operations

RestroCost records stock as a ledger of immutable movements and keeps the
ingredient's current quantity as a fast, transactionally updated balance.
Every write is scoped to the signed-in user's active restaurant.

## Units and conversion

Each ingredient has:

- a base unit used for stock and recipe costing;
- a purchase unit used on supplier invoices;
- a conversion factor from one purchase unit to base units.

Standard mass, volume, and count conversions are calculated automatically.
Packaging units such as boxes, trays, bags, and packs require an
ingredient-specific factor. Incompatible dimensions are rejected.

## Purchase costing

For each purchase line:

1. Purchased quantity is converted to the ingredient's base unit.
2. The usable quantity is reduced by the configured waste percentage.
3. Effective cost per usable base unit is calculated.
4. Current ingredient cost is updated with a weighted average.
5. A price-history record and a purchase inventory movement are appended.

The purchase stores the exact conversion factor and monetary values used at
the time, so later master-data changes do not rewrite history.

## Corrections

Stock corrections create an adjustment movement with a signed quantity and a
reason. Existing movements are not edited. Negative balances are rejected
unless the restaurant explicitly enables negative stock.

## Low-stock status

An ingredient is low when its current base-unit quantity is less than or equal
to its reorder level. Disabled and soft-deleted ingredients do not appear in
operational lists.
