import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPeriod } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PeriodFields } from "@/components/period-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, money } from "@/lib/calendar";

export default async function PeriodsPage(props: PageProps<"/periods">) {
  const user = await requireUser();
  const { error } = await props.searchParams;
  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("periods")
    .select("id, name, starts_on, ends_on, opening_balance, currency, operations(count)")
    .eq("user_id", user.id)
    .order("starts_on", { ascending: false });

  return (
    <div className="space-y-8">
      {error === "forbidden" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">Эта страница только для админа.</p>
      )}
      <div>
        <h1 className="text-2xl font-bold">Мои платёжные календари</h1>
        <p className="text-muted-foreground">
          Один календарь — один период (месяц, квартал). Внутри: остаток на начало, платежи и поступления.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(periods ?? []).length === 0 && (
          <p className="text-muted-foreground">Пока нет ни одного календаря. Создай первый ниже 👇</p>
        )}
        {(periods ?? []).map((p) => {
          const count = (p.operations as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link key={p.id} href={`/periods/${p.id}`}>
              <Card className="gap-2 px-6 py-5 transition-colors hover:border-primary">
                <div className="flex items-center gap-2 font-semibold">
                  <CalendarDays className="size-4 text-primary" /> {p.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(p.starts_on)} — {formatDate(p.ends_on)}
                </div>
                <div className="text-sm">
                  Остаток на начало: <b>{money(p.opening_balance, p.currency)}</b> · операций: {count}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новый календарь</CardTitle>
          <CardDescription>Выбери период и укажи, сколько денег на счетах на его начало.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createPeriod} submitLabel="Создать календарь" className="grid gap-4 sm:grid-cols-2">
            <PeriodFields />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
