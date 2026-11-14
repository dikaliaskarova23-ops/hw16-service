import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCalendarWorkbook } from "@/lib/excel";
import type { Operation, Period } from "@/lib/calendar";

// Отдаёт готовый платёжный календарь в формате Excel
export async function GET(_req: Request, ctx: RouteContext<"/periods/[id]/export">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });

  const [{ data: period }, { data: ops }] = await Promise.all([
    supabase.from("periods").select("*").eq("id", id).single(),
    supabase.from("operations").select("*").eq("period_id", id),
  ]);
  if (!period) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const buf = await buildCalendarWorkbook(period as Period, (ops ?? []) as Operation[]);
  const filename = `Платёжный календарь - ${(period as Period).name}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payment-calendar.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
