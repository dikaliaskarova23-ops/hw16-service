"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";

const STATUSES = ["todo", "in_progress", "done"];

function readAssignment(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const status = String(formData.get("status") ?? "todo");
  const semester = String(formData.get("semester_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!subject || !title || !deadline || Number.isNaN(Date.parse(deadline))) {
    throw new Error("Заполни предмет, задание и дедлайн");
  }
  if (!STATUSES.includes(status)) throw new Error("Неверный статус");

  return {
    subject: subject.slice(0, 80),
    title: title.slice(0, 200),
    deadline: new Date(deadline).toISOString(),
    status,
    semester_id: semester || null,
    notes: notes || null,
  };
}

export async function createAssignment(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .insert({ ...readAssignment(formData), user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/assignments");
}

export async function updateAssignment(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  // RLS в базе пропустит только владельца или админа
  const { error } = await supabase.from("assignments").update(readAssignment(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assignments");
  redirect("/assignments");
}

export async function deleteAssignment(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assignments");
  revalidatePath("/admin");
}

export async function setStatus(id: string, status: string) {
  await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Неверный статус");
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/assignments");
}

export async function createSemester(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Укажи название семестра");
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").insert({
    name,
    user_id: user.id,
    starts_on: String(formData.get("starts_on") ?? "") || null,
    ends_on: String(formData.get("ends_on") ?? "") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/semesters");
  revalidatePath("/assignments");
}

export async function deleteSemester(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/semesters");
  revalidatePath("/assignments");
}

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
