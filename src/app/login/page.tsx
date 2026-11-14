import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/assignments");
  const { error } = await props.searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>Чтобы видеть свои задания и дедлайны</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">Не получилось войти, попробуй ещё раз.</p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
