# CSV imports and exports

The CSV workspace is available to owners and accountants with export
permission. Every import and export is resolved from the authenticated
restaurant membership; CSV data cannot choose a tenant.

Supported templates:

- ingredients
- suppliers
- purchases
- menu items
- sales
- expenses

## Import workflow

1. Select a record type and download its template.
2. Fill the template using enum values shown in existing exports.
3. Upload a CSV file no larger than 2 MB.
4. Map every required RestroCost field to a source column.
5. Review the first five rows.
6. Confirm the import.
7. Review the imported and failed counts plus row-level errors.

The server parses every row again with Zod. Imports are capped at 5,000 rows
per operation. Valid rows are committed independently so one bad row does not
discard the rest of the file.

Purchase and sale templates represent one item per row. Repeating an invoice
or order reference appends distinct items to that purchase or sale; the
supplier/branch or channel/branch must remain consistent and an ingredient or
menu item cannot be repeated within the same record. Imported purchases update
weighted inventory cost. Imported sales save financial snapshots and deduct
nested recipe ingredients.

## Export safety

Exports are permission-checked, capped at 10,000 rows, and returned with
private/no-store caching. Values that can trigger spreadsheet formulas are
escaped to reduce CSV injection risk.
