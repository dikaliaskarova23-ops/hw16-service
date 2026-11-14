// Часовой пояс для отображения дат (по умолчанию UTC+5).
export const APP_TZ = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Almaty";

export const STATUS_LABELS = {
  todo: "Не начато",
  in_progress: "В работе",
  done: "Сдано",
} as const;
export type Status = keyof typeof STATUS_LABELS;

export function formatDeadline(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ISO → значение для <input type="datetime-local"> в часовом поясе приложения
export function toLocalInput(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function deadlineState(iso: string, status: string) {
  if (status === "done") return "done" as const;
  const hours = (new Date(iso).getTime() - Date.now()) / 36e5;
  if (hours < 0) return "overdue" as const;
  if (hours < 72) return "soon" as const;
  return "later" as const;
}
