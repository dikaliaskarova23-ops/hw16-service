# 💸 Платёжный календарь

Веб-сервис: вносишь остаток денег, планируемые платежи и поступления (вручную или файлом Excel)
и получаешь готовый платёжный календарь в Excel с остатком на каждый день и подсветкой кассовых разрывов.

Next.js 16 + shadcn/ui + Supabase, деплой на Vercel.

- Календари по периодам (сущность «период»: месяц/квартал, вместо копий таблиц)
- Операции: добавление, редактирование, удаление; загрузка из Excel по шаблону (`/template`)
- Выгрузка в Excel (`/periods/<id>/export`): листы «Календарь» (формулы по дням), «Операции», «По статьям»
- Вход через Google и по ссылке на почту, один аккаунт на один адрес
- Роли «пользователь» и «админ», роль проверяется на сервере (`requireAdmin()` + RLS в базе)
- Проблема и персона: [docs/problem.md](docs/problem.md), стек: [docs/stack.md](docs/stack.md),
  настройка: [docs/SETUP.md](docs/SETUP.md)

## Запуск локально

```bash
cp .env.example .env.local   # вставить URL и anon key из Supabase
npm install
npm run dev
```

## База данных

Таблицы создаются миграцией `supabase/migrations/20261114130000_init.sql`:

```bash
supabase login
supabase link --project-ref <ref-проекта>
supabase db push
```

Сделать себя админом (Supabase → SQL Editor), после первого входа:

```sql
update public.profiles set role = 'admin' where email = 'твоя@почта';
```
