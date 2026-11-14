import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateOperation } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { OperationFields } from "@/components/operation-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditOperationPage(props: PageProps<"/periods/[id]/operations/[opId]/edit">) {
  await requireUser();
  const { id, opId } = await props.params;
  const supabase = await createClient();
  const [{ data: p }, { data: op }] = await Promise.all([
    supabase.from("periods").select("starts_on, ends_on").eq("id", id).single(),
    supabase.from("operations").select("*").eq("id", opId).eq("period_id", id).single(),
  ]);
  if (!p || !op) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/periods/${id}`} className="text-sm text-muted-foreground hover:text-primary">← Назад к календарю</Link>
      <Card>
        <CardHeader><CardTitle>Редактировать операцию</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={updateOperation.bind(null, id, opId)} submitLabel="Сохранить" className="grid gap-4 sm:grid-cols-2">
            <OperationFields min={p.starts_on} max={p.ends_on} initial={op} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
