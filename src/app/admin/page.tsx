import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAssignment, setUserRole } from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDeadline, STATUS_LABELS, type Status } from "@/lib/format";

// Страница админа. requireAdmin() проверяет роль на сервере:
// обычный пользователь, открывший /admin по прямой ссылке, будет перенаправлен.
export default async function AdminPage() {
  const me = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase
      .from("assignments")
      .select("id, user_id, subject, title, deadline, status")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Админка</h1>
        <p className="text-muted-foreground">Пользователи сервиса и последние задания всех пользователей.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Пользователи ({profiles?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Почта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.email}{p.full_name ? <div className="text-xs text-muted-foreground">{p.full_name}</div> : null}</TableCell>
                  <TableCell>
                    <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                      {p.role === "admin" ? "админ" : "пользователь"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.id !== me.id && (
                      <form action={setUserRole.bind(null, p.id, p.role === "admin" ? "user" : "admin")}>
                        <Button size="sm" variant="outline" type="submit">
                          {p.role === "admin" ? "Сделать пользователем" : "Сделать админом"}
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Последние задания всех пользователей</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Кто</TableHead>
                <TableHead>Предмет</TableHead>
                <TableHead>Задание</TableHead>
                <TableHead>Дедлайн</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignments ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{emailById.get(a.user_id) ?? "—"}</TableCell>
                  <TableCell>{a.subject}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDeadline(a.deadline)}</TableCell>
                  <TableCell>{STATUS_LABELS[a.status as Status]}</TableCell>
                  <TableCell><ConfirmDeleteButton action={deleteAssignment.bind(null, a.id)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
