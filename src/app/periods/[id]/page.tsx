import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Download, FileSpreadsheet, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createOperation, deleteOperation, deletePeriod, importOperations } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ImportForm } from "@/components/import-form";
import { OperationFields } from "@/components/operation-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildCalendar, formatDate, money, STATUS_LABELS, type Operation, type Period } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export default async function PeriodPage(props: PageProps<"/periods/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: period }, { data: ops }] = await Promise.all([
    supabase.from("periods").select("*").eq("id", id).single(),
    supabase.from("operations").select("*").eq("period_id", id).order("op_date").order("created_at"),
  ]);
  if (!period) notFound();

  const p = period as Period;
  const operations = (ops ?? []) as Operation[];
  const cal = buildCalendar(p, operations);
  const m = (n: number | string) => money(n, p.currency);
  const busyDays = cal.days.filter((d) => d.ops.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/periods" className="text-sm text-muted-foreground hover:text-primary">← Все календари</Link>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="text-muted-foreground">{formatDate(p.starts_on)} — {formatDate(p.ends_on)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/periods/${p.id}/export`}><Download /> Скачать Excel</a>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Изменить период" title="Изменить период">
            <Link href={`/periods/${p.id}/edit`}><Pencil /></Link>
          </Button>
          <ConfirmDeleteButton action={deletePeriod.bind(null, p.id)} label="Удалить календарь" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Остаток на начало", m(cal.opening)],
          ["Поступления", `+${m(cal.totalIn)}`],
          ["Платежи", `−${m(cal.totalOut)}`],
          ["Остаток на конец", m(cal.closing)],
        ].map(([label, value]) => (
          <Card key={label} className="gap-1 px-5 py-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
          </Card>
        ))}
      </div>

      {cal.gaps.length > 0 ? (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <b>Кассовый разрыв:</b> денег не хватает {cal.gaps.length} дн., первый раз {formatDate(cal.gaps[0].date)}.
            Самый низкий остаток {m(cal.minDay.closing)} ({formatDate(cal.minDay.date)}). Перенеси платёж или ускорь поступление.
          </div>
        </div>
      ) : operations.length > 0 ? (
        <p className="rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">
          Кассовых разрывов нет. Самый низкий остаток {m(cal.minDay.closing)} ({formatDate(cal.minDay.date)}).
        </p>
      ) : null}

      <Card className="py-2">
        <CardHeader className="pt-4">
          <CardTitle>Календарь по дням</CardTitle>
          <CardDescription>Показаны дни с операциями. В Excel — все дни периода.</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          {busyDays.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Добавь платежи и поступления ниже или загрузи их из Excel.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Операция</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">Остаток на конец дня</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {busyDays.map((d) =>
                  d.ops.map((o, i) => (
                    <TableRow key={o.id} className={cn(d.closing < 0 && "bg-destructive/5")}>
                      <TableCell className="whitespace-nowrap align-top">{i === 0 ? formatDate(d.date) : ""}</TableCell>
                      <TableCell>
                        <div className="font-medium">{o.category}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.counterparty ? `${o.counterparty} · ` : ""}
                          <Badge variant={o.status === "done" ? "secondary" : "outline"} className="ml-0.5">{STATUS_LABELS[o.status]}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-right whitespace-nowrap font-medium", o.kind === "inflow" ? "text-green-700" : "text-foreground")}>
                        {o.kind === "inflow" ? "+" : "−"}{m(o.amount)}
                      </TableCell>
                      <TableCell className={cn("text-right whitespace-nowrap", d.closing < 0 && "font-semibold text-destructive")}>
                        {i === d.ops.length - 1 ? m(d.closing) : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <Button asChild variant="ghost" size="icon" aria-label="Редактировать" title="Редактировать">
                            <Link href={`/periods/${p.id}/operations/${o.id}/edit`}><Pencil /></Link>
                          </Button>
                          <ConfirmDeleteButton action={deleteOperation.bind(null, p.id, o.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Добавить платёж или поступление</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={createOperation.bind(null, p.id)}
            submitLabel="Добавить"
            resetOnSuccess
            className="grid gap-4 sm:grid-cols-2"
          >
            <OperationFields min={p.starts_on} max={p.ends_on} />
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Загрузить из Excel</CardTitle>
          <CardDescription>
            Колонки: Дата, Тип (Поступление/Платёж), Статья, Контрагент, Сумма, Статус (План/Факт), Комментарий.{" "}
            <a href="/template" className="inline-flex items-center gap-1 text-primary underline">
              <FileSpreadsheet className="size-3.5" /> Скачать шаблон
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm action={importOperations.bind(null, p.id)} />
        </CardContent>
      </Card>
    </div>
  );
}
