import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createSemester, deleteSemester } from "@/app/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SemestersPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: semesters } = await supabase
    .from("semesters")
    .select("id, name, starts_on, ends_on, assignments(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Семестры</h1>
        <p className="text-muted-foreground">
          Один список заданий на всё обучение, а семестр — просто метка. Так не нужно заводить новую таблицу каждый семестр.
        </p>
      </div>

      <div className="grid gap-3">
        {(semesters ?? []).length === 0 && <p className="text-muted-foreground">Семестров пока нет.</p>}
        {(semesters ?? []).map((s) => {
          const count = (s.assignments as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Card key={s.id} className="flex-row items-center justify-between px-6 py-4">
              <div>
                <Link href={`/assignments?semester=${s.id}`} className="font-medium hover:text-primary">{s.name}</Link>
                <div className="text-sm text-muted-foreground">
                  {s.starts_on && s.ends_on ? `${s.starts_on} — ${s.ends_on} · ` : ""}заданий: {count}
                </div>
              </div>
              <ConfirmDeleteButton action={deleteSemester.bind(null, s.id)} />
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новый семестр</CardTitle>
          <CardDescription>Например, «Осень 2026»</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSemester} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input id="name" name="name" required maxLength={80} placeholder="Осень 2026" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="starts_on">Начало</Label>
              <Input id="starts_on" name="starts_on" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_on">Конец</Label>
              <Input id="ends_on" name="ends_on" type="date" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Добавить семестр</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
