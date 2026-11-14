"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportState } from "@/app/actions";

export function ImportForm({
  action,
}: {
  action: (prev: ImportState, formData: FormData) => Promise<ImportState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="file" type="file" accept=".xlsx" required className="sm:max-w-xs" />
        <Button type="submit" variant="secondary" disabled={pending}>
          <Upload /> {pending ? "Загружаю…" : "Загрузить"}
        </Button>
      </div>
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      {state.errors && (
        <ul className="list-disc pl-5 text-sm text-destructive">
          {state.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </form>
  );
}
