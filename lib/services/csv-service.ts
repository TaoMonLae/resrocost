export const csvTemplates = {
  ingredients: [
    "name", "sku", "category", "baseUnit", "purchaseUnit",
    "conversionFactor", "currentStock", "minimumStock", "unitCost",
    "wastePercentage",
  ],
  suppliers: [
    "name", "contactPerson", "phone", "email", "address", "paymentTerms",
  ],
  purchases: [
    "invoiceNumber", "purchaseDate", "supplier", "branchCode", "ingredient",
    "quantity", "purchaseUnit", "unitPrice", "batchNumber", "expiryDate",
  ],
  "menu-items": [
    "name", "sku", "category", "recipe", "sellingPrice",
    "targetFoodCostPercentage", "targetProfitMargin", "packagingCost",
    "directLaborCost", "utilityCost", "otherVariableCost", "overheadAllocation",
  ],
  sales: [
    "orderReference", "soldAt", "branchCode", "channel", "menuItem",
    "quantity", "discount", "tax", "serviceCharge", "paymentMethod",
  ],
  expenses: [
    "category", "branchCode", "expenseDate", "amount", "tax", "type",
    "recurrence", "payee", "paymentMethod", "description",
  ],
} as const;

export type CsvTemplateType = keyof typeof csvTemplates;

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n") {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") field += character;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, ...values] = rows;
  return {
    headers,
    rows: values.map((valuesRow) =>
      Object.fromEntries(headers.map((header, index) => [header, valuesRow[index] ?? ""])),
    ),
  };
}

export function serializeCsv(
  headers: readonly string[],
  rows: readonly Record<string, unknown>[],
) {
  const escape = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (/^[=+@\t\r]/.test(text)) text = `'${text}`;
    if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function validateCsvFile(file: { size: number; type: string; name: string }, maxSize = 2_000_000) {
  if (file.size <= 0) throw new Error("CSV file is empty");
  if (file.size > maxSize) throw new Error("CSV file exceeds the upload limit");
  const extensionValid = file.name.toLowerCase().endsWith(".csv");
  const typeValid = ["text/csv", "application/csv", "text/plain", ""].includes(file.type);
  if (!extensionValid || !typeValid) throw new Error("Upload a valid CSV file");
}
