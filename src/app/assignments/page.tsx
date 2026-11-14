import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAssignment, deleteAssignment, setStatus } from "@/app/actions";
import { AssignmentForm } from "@/components/assignment-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deadlineState, formatDeadline, STATUS_LABELS, type Status } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  subject: string;
  title: string;
  deadline: string;
  status: Status;
  semesters: { name: string } | null;
};

const NEXT_STATUS: Record<Status, Status> = { todo: "in_progress", in_progress: "done", done: "todo" };

export default async function AssignmentsPage(props: PageProps<"/assignments">) {
  const user = await requireUser();
  const { semester, show, error } = await props.searchParams;
  const supabase = await createClient();

  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let query = supabase
    .from("assignments")
    .select("id, subject, title, deadline, status, semesters(name)")
    .eq("user_id", user.id)
    .order("deadline", { ascending: true });
  if (typeof semester === "string" && semester) query = query.eq("semester_id", semester);
  if (show !== "all") query = query.neq("status", "done");
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const filterHref = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { semester: semester as string | undefined, show: show as string | undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return s ? `/assignments?${s}` : "/assignments";
  };

  return (
    <div className="space-y-8">
      {error === "forbidden" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Эта страница только для админа.
        </p>
      )}

      <div>
        <h1 className="text-2xl font-bold">Мои задания</h1>
        <p className="text-muted-foreground">Сначала самые близкие дедлайны.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Button asChild size="sm" variant={!semester ? "default" : "outline"}>
          <Link href={filterHref({ semester: undefined })}>Все семестры</Link>
        </Button>
        {(semesters ?? []).map((s) => (
          <Button asChild key={s.id} size="sm" variant={semester === s.id ? "default" : "outline"}>
            <Link href={filterHref({ semester: s.id })}>{s.name}</Link>
          </Button>
        ))}
        <Button asChild size="sm" variant="ghost" className="ml-auto">
          <Link href={filterHref({ show: show === "all" ? undefined : "all" })}>
            {show === "all" ? "Скрыть сданные" : "Показать сданные"}
          </Link>
        </Button>
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">
              Пока пусто. Добавь первое задание ниже 👇
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Предмет</TableHead>
                  <TableHead>Задание</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const state = deadlineState(r.deadline, r.status);
                  return (
                    <TableRow key={r.id} className={cn(r.status === "done" && "opacity-60")}>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            state === "overdue" && "font-semibold text-destructive",
                            state === "soon" && "font-semibold text-amber-600"
                          )}
                        >
                          {formatDeadline(r.deadline)}
                        </span>
                        {state === "overdue" && <div className="text-xs text-destructive">просрочено</div>}
                      </TableCell>
                      <TableCell>
                        {r.subject}
                        {r.semesters && <div className="text-xs text-muted-foreground">{r.semesters.name}</div>}
                      </TableCell>
                      <TableCell className={cn(r.status === "done" && "line-through")}>{r.title}</TableCell>
                      <TableCell>
                        <form action={setStatus.bind(null, r.id, NEXT_STATUS[r.status])}>
                          <button type="submit" title="Нажми, чтобы сменить статус">
                            <Badge variant={r.status === "done" ? "secondary" : r.status === "in_progress" ? "default" : "outline"}>
                              {STATUS_LABELS[r.status]}
                            </Badge>
                          </button>
                        </form>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <Button asChild variant="ghost" size="icon" aria-label="Редактировать" title="Редактировать">
                            <Link href={`/assignments/${r.id}/edit`}><Pencil /></Link>
                          </Button>
                          <ConfirmDeleteButton action={deleteAssignment.bind(null, r.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Добавить задание</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentForm action={createAssignment} semesters={semesters ?? []} submitLabel="Добавить" />
        </CardContent>
      </Card>
    </div>
  );
}
