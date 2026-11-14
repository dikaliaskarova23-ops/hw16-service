import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setUserRole } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, money } from "@/lib/calendar";

// Страница админа. requireAdmin() проверяет роль на сервере:
// обычный пользователь, открывший /admin по прямой ссылке, будет перенаправлен.
export default async function AdminPage() {
  const me = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: periods }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase
      .from("periods")
      .select("id, user_id, name, starts_on, ends_on, opening_balance, currency, operations(count)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Админка</h1>
        <p className="text-muted-foreground">Пользователи сервиса и их платёжные календари.</p>
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
                  <TableCell>
                    {p.email}
                    {p.full_name ? <div className="text-xs text-muted-foreground">{p.full_name}</div> : null}
                  </TableCell>
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
        <CardHeader><CardTitle>Календари всех пользователей</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Кто</TableHead>
                <TableHead>Календарь</TableHead>
                <TableHead>Период</TableHead>
                <TableHead className="text-right">Остаток на начало</TableHead>
                <TableHead className="text-right">Операций</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(periods ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{emailById.get(p.user_id) ?? "—"}</TableCell>
                  <TableCell><Link href={`/periods/${p.id}`} className="hover:text-primary">{p.name}</Link></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.starts_on)} — {formatDate(p.ends_on)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{money(p.opening_balance, p.currency)}</TableCell>
                  <TableCell className="text-right">{(p.operations as unknown as { count: number }[])?.[0]?.count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
