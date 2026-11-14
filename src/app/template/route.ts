import { NextResponse } from "next/server";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  const buf = await buildTemplateWorkbook();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template.xlsx"; filename*=UTF-8''${encodeURIComponent("Шаблон операций.xlsx")}`,
    },
  });
}
