import { NextResponse } from "next/server";
import {
  csvTemplates,
  serializeCsv,
  type CsvTemplateType,
} from "@/lib/services/csv-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!(type in csvTemplates)) {
    return NextResponse.json({ error: "Unknown CSV template" }, { status: 404 });
  }
  const headers = csvTemplates[type as CsvTemplateType];
  const body = serializeCsv(headers, []);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="restrocost-${type}-template.csv"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
