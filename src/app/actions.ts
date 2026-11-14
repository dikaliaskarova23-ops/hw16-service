"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseOperationsWorkbook } from "@/lib/excel";

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));

// ---------- Периоды ----------

function readPeriod(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const starts_on = String(formData.get("starts_on") ?? "");
  const ends_on = String(formData.get("ends_on") ?? "");
  const opening_balance = num(formData.get("opening_balance") || "0");
  const currency = String(formData.get("currency") ?? "KZT").toUpperCase().slice(0, 3) || "KZT";

  if (!name) throw new Error("Укажи название периода");
  if (!isDate(starts_on) || !isDate(ends_on)) throw new Error("Укажи даты начала и конца");
  if (ends_on < starts_on) throw new Error("Конец периода раньше начала");
  if ((Date.parse(ends_on) - Date.parse(starts_on)) / 864e5 > 366) throw new Error("Период не длиннее года");
  if (!Number.isFinite(opening_balance)) throw new Error("Остаток должен быть числом");
  return { name, starts_on, ends_on, opening_balance, currency };
}

export async function createPeriod(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .insert({ ...readPeriod(formData), user_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/periods");
  redirect(`/periods/${data.id}`);
}

export async function updatePeriod(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("periods").update(readPeriod(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/periods/${id}`);
  redirect(`/periods/${id}`);
}

export async function deletePeriod(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/periods");
  redirect("/periods");
}

// ---------- Операции (платежи и поступления) ----------

function readOperation(formData: FormData) {
  const op_date = String(formData.get("op_date") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const category = String(formData.get("category") ?? "").trim().slice(0, 80);
  const counterparty = String(formData.get("counterparty") ?? "").trim().slice(0, 120);
  const amount = num(formData.get("amount"));
  const status = String(formData.get("status") ?? "planned");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!isDate(op_date)) throw new Error("Укажи дату");
  if (kind !== "inflow" && kind !== "outflow") throw new Error("Выбери тип: поступление или платёж");
  if (!category) throw new Error("Укажи статью");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Сумма должна быть больше 0");
  if (status !== "planned" && status !== "done") throw new Error("Неверный статус");

  return {
    op_date,
    kind,
    category,
    counterparty: counterparty || null,
    amount: Math.round(amount * 100) / 100,
    status,
    notes: notes || null,
  };
}

export async function createOperation(periodId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("operations")
    .insert({ ...readOperation(formData), period_id: periodId, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath(`/periods/${periodId}`);
}

export async function updateOperation(periodId: string, id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  // RLS в базе пропустит только владельца или админа
  const { error } = await supabase.from("operations").update(readOperation(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/periods/${periodId}`);
  redirect(`/periods/${periodId}`);
}

export async function deleteOperation(periodId: string, id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("operations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/periods/${periodId}`);
  revalidatePath("/admin");
}

export type ImportState = { ok?: string; errors?: string[] };

// Загрузка операций из Excel (.xlsx)
export async function importOperations(
  periodId: string,
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { errors: ["Выбери файл .xlsx"] };
  if (file.size > 5 * 1024 * 1024) return { errors: ["Файл больше 5 МБ"] };

  let parsed;
  try {
    parsed = await parseOperationsWorkbook(await file.arrayBuffer());
  } catch {
    return { errors: ["Не получилось прочитать файл. Нужен формат .xlsx (как в шаблоне)"] };
  }
  if (parsed.rows.length === 0) return { errors: parsed.errors.length ? parsed.errors : ["В файле нет строк с операциями"] };
  if (parsed.rows.length > 2000) return { errors: ["Не больше 2000 строк за раз"] };

  const supabase = await createClient();
  const { error } = await supabase
    .from("operations")
    .insert(parsed.rows.map((r) => ({ ...r, period_id: periodId, user_id: user.id })));
  if (error) return { errors: [error.message] };

  revalidatePath(`/periods/${periodId}`);
  return {
    ok: `Загружено операций: ${parsed.rows.length}`,
    errors: parsed.errors.length ? [`Пропущено строк: ${parsed.errors.length}`, ...parsed.errors.slice(0, 10)] : undefined,
  };
}

// ---------- Админ ----------

// Только для админа: проверка роли на сервере, а не только скрытая кнопка.
export async function setUserRole(userId: string, role: "user" | "admin") {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("Нельзя менять роль самому себе");
  if (role !== "user" && role !== "admin") throw new Error("Неверная роль");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
