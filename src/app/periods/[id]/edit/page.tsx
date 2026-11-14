import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updatePeriod } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PeriodFields } from "@/components/period-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditPeriodPage(props: PageProps<"/periods/[id]/edit">) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("periods").select("*").eq("id", id).single();
  if (!p) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/periods/${id}`} className="text-sm text-muted-foreground hover:text-primary">← Назад к календарю</Link>
      <Card>
        <CardHeader><CardTitle>Изменить период</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={updatePeriod.bind(null, id)} submitLabel="Сохранить" className="grid gap-4 sm:grid-cols-2">
            <PeriodFields initial={p} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
