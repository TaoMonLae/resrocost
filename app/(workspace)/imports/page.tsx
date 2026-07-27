import { Database } from "lucide-react";
import { CsvImporter } from "@/components/imports/csv-importer";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/tenant";

const exports = ["ingredients", "suppliers", "purchases", "menu-items", "sales", "expenses"] as const;

export default async function ImportsPage() {
  await requirePermission("reports:export");
  return <main className="min-h-screen"><PageHeader description="Template-driven import with mapping, preview, server validation, and row results." eyebrow="Data operations" icon={Database} title="CSV workspace" /><div className="mx-auto max-w-[1540px] space-y-6 px-5 py-7 sm:px-8"><CsvImporter /><section className="rounded-xl border bg-card p-5 shadow-[var(--shadow)]"><h2 className="font-medium">Export restaurant data</h2><p className="mt-1 text-xs text-muted-foreground">Exports are tenant-scoped, permission-checked, and protected against spreadsheet formula injection.</p><div className="mt-4 flex flex-wrap gap-2">{exports.map((type) => <Button asChild key={type} variant="outline"><a href={`/api/csv/export/${type}`}>Export {type.replace("-", " ")}</a></Button>)}</div></section></div></main>;
}
