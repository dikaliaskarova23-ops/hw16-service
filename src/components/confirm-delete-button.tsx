"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteButton({
  action,
  label = "Удалить",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (confirm("Точно удалить?")) startTransition(() => action());
      }}
    >
      <Trash2 className="text-destructive" />
    </Button>
  );
}
