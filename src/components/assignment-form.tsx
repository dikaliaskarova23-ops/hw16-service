"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABELS } from "@/lib/format";

type Semester = { id: string; name: string };
type Values = {
  subject: string;
  title: string;
  deadline: string; // формат datetime-local
  status: string;
  semester_id: string | null;
  notes: string | null;
};

export function AssignmentForm({
  action,
  semesters,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  semesters: Semester[];
  initial?: Values;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Дедлайн вводится по времени браузера — переводим в ISO с часовым поясом
    const local = String(fd.get("deadline") ?? "");
    if (local) fd.set("deadline", new Date(local).toISOString());
    setError("");
    startTransition(async () => {
      try {
        await action(fd);
        if (!initial) formRef.current?.reset();
      } catch (err) {
        // redirect() из server action — это не ошибка
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Не получилось сохранить");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="subject">Предмет</Label>
        <Input id="subject" name="subject" required maxLength={80} placeholder="Матанализ" defaultValue={initial?.subject} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deadline">Дедлайн</Label>
        <Input id="deadline" name="deadline" type="datetime-local" required defaultValue={initial?.deadline} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Что сделать</Label>
        <Input id="title" name="title" required maxLength={200} placeholder="Решить задачи 1–10 из параграфа 3" defaultValue={initial?.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="semester_id">Семестр</Label>
        <NativeSelect id="semester_id" name="semester_id" defaultValue={initial?.semester_id ?? ""}>
          <option value="">Без семестра</option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Статус</Label>
        <NativeSelect id="status" name="status" defaultValue={initial?.status ?? "todo"}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Заметка</Label>
        <Textarea id="notes" name="notes" placeholder="Где лежит задание, формат сдачи…" defaultValue={initial?.notes ?? ""} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Сохраняю…" : submitLabel}</Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
