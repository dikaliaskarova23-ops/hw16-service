import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  if (await getCurrentUser()) redirect("/assignments");

  return (
    <section className="mx-auto max-w-xl py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Все дедлайны в одном месте
      </h1>
      <p className="mt-4 text-muted-foreground">
        Задания приходят в пять разных чатов, и сроки теряются. Записывай каждое задание
        сюда за 10 секунд и смотри, что горит на этой неделе.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/login">Начать</Link>
      </Button>
    </section>
  );
}
