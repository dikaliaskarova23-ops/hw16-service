// Расчёт платёжного календаря: по дням периода считаем остаток на начало,
// поступления, платежи и остаток на конец. Отрицательный остаток = кассовый разрыв.

export type Kind = "inflow" | "outflow";
export type OpStatus = "planned" | "done";

export type Operation = {
  id: string;
  op_date: string; // YYYY-MM-DD
  kind: Kind;
  category: string;
  counterparty: string | null;
  amount: number | string;
  status: OpStatus;
  notes: string | null;
};

export type Period = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  opening_balance: number | string;
  currency: string;
};

export type DayRow = {
  date: string;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  ops: Operation[];
};

export const KIND_LABELS: Record<Kind, string> = { inflow: "Поступление", outflow: "Платёж" };
export const STATUS_LABELS: Record<OpStatus, string> = { planned: "План", done: "Факт" };

const round = (n: number) => Math.round(n * 100) / 100;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildCalendar(period: Period, operations: Operation[]) {
  const byDate = new Map<string, Operation[]>();
  for (const op of operations) {
    if (op.op_date < period.starts_on || op.op_date > period.ends_on) continue;
    byDate.set(op.op_date, [...(byDate.get(op.op_date) ?? []), op]);
  }

  const days: DayRow[] = [];
  let balance = Number(period.opening_balance);
  for (let d = period.starts_on; d <= period.ends_on; d = addDays(d, 1)) {
    const ops = byDate.get(d) ?? [];
    const inflow = round(ops.filter((o) => o.kind === "inflow").reduce((s, o) => s + Number(o.amount), 0));
    const outflow = round(ops.filter((o) => o.kind === "outflow").reduce((s, o) => s + Number(o.amount), 0));
    const opening = balance;
    balance = round(balance + inflow - outflow);
    days.push({ date: d, opening, inflow, outflow, closing: balance, ops });
  }

  const totalIn = round(days.reduce((s, r) => s + r.inflow, 0));
  const totalOut = round(days.reduce((s, r) => s + r.outflow, 0));
  const gaps = days.filter((r) => r.closing < 0);
  const minDay = days.reduce((m, r) => (r.closing < m.closing ? r : m), days[0]);

  return {
    days,
    totalIn,
    totalOut,
    opening: Number(period.opening_balance),
    closing: balance,
    gaps,
    minDay,
  };
}

export function money(n: number | string, currency = "KZT") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
