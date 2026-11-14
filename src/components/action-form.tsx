"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

// Форма, которая вызывает server action и показывает ошибку под кнопкой.
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        await action(fd);
        if (resetOnSuccess) formRef.current?.reset();
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Не получилось сохранить");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {children}
      <div className="col-span-full flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Сохраняю…" : submitLabel}</Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  );
}
