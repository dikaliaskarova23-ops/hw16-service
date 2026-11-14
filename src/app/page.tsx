import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, FileSpreadsheet, Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: Upload, title: "Внеси данные", text: "Остаток денег, планируемые платежи и поступления — вручную или файлом Excel." },
  { icon: CalendarCheck, title: "Увидь разрывы", text: "Сервис посчитает остаток на каждый день и покажет, где денег не хватит." },
  { icon: FileSpreadsheet, title: "Скачай Excel", text: "Готовый платёжный календарь по дням с формулами — можно отправить бухгалтеру." },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/periods");

  return (
    <section className="py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Платёжный календарь за 5 минут</h1>
        <p className="mt-4 text-muted-foreground">
          Вместо ручной таблицы, которую каждый месяц собираешь заново: внеси платежи, поступления
          и остатки, а сервис соберёт календарь и выгрузит его в Excel.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/login">Начать бесплатно</Link>
        </Button>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border bg-card p-5">
            <Icon className="size-6 text-primary" />
            <div className="mt-3 font-semibold">{title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
