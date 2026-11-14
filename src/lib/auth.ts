import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "user" | "admin";

// Текущий пользователь + его роль из таблицы profiles. Роль читается на сервере из БД,
// поэтому подделать её в браузере нельзя.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    name: (profile?.full_name as string | null) ?? user.email ?? "",
    role: ((profile?.role as Role | undefined) ?? "user") as Role,
    providers: (user.identities ?? []).map((i) => i.provider),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/assignments?error=forbidden");
  return user;
}
