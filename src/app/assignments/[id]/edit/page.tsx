import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAssignment } from "@/app/actions";
import { AssignmentForm } from "@/components/assignment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toLocalInput } from "@/lib/format";

export default async function EditAssignmentPage(props: PageProps<"/assignments/[id]/edit">) {
  const user = await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: a }, { data: semesters }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", id).single(),
    supabase.from("semesters").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (!a) notFound();

  return (
    <div className="space-y-4">
      <Link href="/assignments" className="text-sm text-muted-foreground hover:text-primary">← Назад к списку</Link>
      <Card>
        <CardHeader>
          <CardTitle>Редактировать задание</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentForm
            action={updateAssignment.bind(null, a.id)}
            semesters={semesters ?? []}
            submitLabel="Сохранить"
            initial={{
              subject: a.subject,
              title: a.title,
              deadline: toLocalInput(a.deadline),
              status: a.status,
              semester_id: a.semester_id,
              notes: a.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
