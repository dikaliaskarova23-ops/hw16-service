import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold text-primary">
          💸 Платёжный календарь
        </Link>
        {user && (
          <nav className="flex gap-4 text-sm">
            <Link href="/periods" className="hover:text-primary">Календари</Link>
            {/* Ссылку видит только админ, но сама страница /admin ещё раз проверяет роль на сервере */}
            {user.role === "admin" && (
              <Link href="/admin" className="hover:text-primary">Админка</Link>
            )}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role === "admin" ? "админ" : "пользователь"}
              </Badge>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit">Выйти</Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Войти</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
