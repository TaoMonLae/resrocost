"use client";

import { useActionState, useMemo, useState } from "react";
import { FileCheck2, Upload } from "lucide-react";
import {
  importCsvRowsAction,
  initialImportState,
} from "@/app/actions/imports";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  csvTemplates,
  parseCsv,
  validateCsvFile,
  type CsvTemplateType,
} from "@/lib/services/csv-service";

export function CsvImporter() {
  const [type, setType] = useState<CsvTemplateType>("ingredients");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState("");
  const [state, action] = useActionState(importCsvRowsAction, initialImportState);
  const expected = csvTemplates[type];
  const mappedRows = useMemo(
    () =>
      rawRows.map((row) =>
        Object.fromEntries(
          expected.map((field) => [field, row[mapping[field] || field] ?? ""]),
        ),
      ),
    [expected, mapping, rawRows],
  );
  const mappingComplete = expected.every((field) => mapping[field] || headers.includes(field));

  async function readFile(file?: File) {
    setFileError("");
    setRawRows([]);
    setHeaders([]);
    if (!file) return;
    try {
      validateCsvFile(file);
      const parsed = parseCsv(await file.text());
      if (!parsed.rows.length) throw new Error("CSV contains no data rows");
      const nextMapping = Object.fromEntries(
        expected.map((field) => [field, parsed.headers.includes(field) ? field : ""]),
      );
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(nextMapping);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not read CSV");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-[var(--shadow)] md:grid-cols-[260px_1fr_auto]">
        <div><Label className="mb-2 block">Import type</Label><Select value={type} onChange={(event) => { setType(event.target.value as CsvTemplateType); setHeaders([]); setRawRows([]); setMapping({}); }}><option value="ingredients">Ingredients</option><option value="suppliers">Suppliers</option><option value="purchases">Purchases</option><option value="menu-items">Menu items</option><option value="sales">Sales</option><option value="expenses">Expenses</option></Select></div>
        <div><Label className="mb-2 block">Upload CSV (maximum 2 MB)</Label><Input accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} type="file" /></div>
        <div className="flex items-end"><Button asChild variant="outline"><a href={`/api/csv/templates/${type}`}>Download template</a></Button></div>
        {fileError && <p className="text-sm text-[var(--coral)] md:col-span-3">{fileError}</p>}
      </section>

      {headers.length > 0 && (
        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-4"><div><h2 className="font-medium">Map columns</h2><p className="mt-1 text-xs text-muted-foreground">Match each RestroCost field to a column in your file.</p></div><Badge variant={mappingComplete ? "default" : "warning"}>{mappingComplete ? "Mapped" : "Needs mapping"}</Badge></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expected.map((field) => <div key={field}><Label className="mb-2 block">{field}</Label><Select value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">Choose source column</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</Select></div>)}
          </div>
        </section>
      )}

      {mappedRows.length > 0 && mappingComplete && (
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow)]">
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-medium">Preview and validate</h2><p className="mt-1 text-xs text-muted-foreground">{mappedRows.length} rows ready for server validation.</p></div><FileCheck2 className="size-5 text-[var(--forest)]" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b bg-muted/50"><tr>{expected.map((header) => <th className="px-3 py-2 font-medium" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y">{mappedRows.slice(0, 5).map((row, index) => <tr key={index}>{expected.map((header) => <td className="max-w-48 truncate px-3 py-2" key={header}>{row[header] || <span className="text-[var(--coral)]">empty</span>}</td>)}</tr>)}</tbody></table></div>
          {mappedRows.length > 5 && <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing 5 of {mappedRows.length} rows</p>}
          <form action={action} className="flex items-center justify-between gap-4 border-t p-5">
            <input name="type" type="hidden" value={type} />
            <input name="rows" type="hidden" value={JSON.stringify(mappedRows)} />
            <p className="text-xs text-muted-foreground">Confirmation writes valid rows and reports every rejected row.</p>
            <SubmitButton pendingLabel="Importing rows…"><Upload />Confirm import</SubmitButton>
          </form>
        </section>
      )}

      {state.message && (
        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]">
          <h2 className="font-medium">Import result</h2>
          <p className="mt-2 text-sm">{state.message}</p>
          <div className="mt-3 flex gap-2"><Badge>{state.imported} imported</Badge>{state.failed > 0 && <Badge variant="critical">{state.failed} failed</Badge>}</div>
          {state.errors.length > 0 && <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto text-xs text-[var(--coral)]">{state.errors.slice(0, 100).map((error) => <li key={`${error.row}-${error.message}`}>Row {error.row}: {error.message}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}
