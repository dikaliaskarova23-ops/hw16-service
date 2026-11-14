# ⏰ Дедлайны — трекер учебных заданий

Веб-сервис для студентов: все задания и сроки в одном месте.
Next.js 16 + shadcn/ui + Supabase, деплой на Vercel.

- Список заданий по дедлайну, добавление, редактирование, удаление
- Семестры (сущность «период», вместо копий таблиц)
- Вход через Google и по ссылке на почту, один аккаунт на один адрес
- Роли «пользователь» и «админ», роль проверяется на сервере (`requireAdmin()` + RLS в базе)
- Проблема и персона: [docs/problem.md](docs/problem.md), стек: [docs/stack.md](docs/stack.md)

## Запуск локально

```bash
cp .env.example .env.local   # вставить URL и anon key из Supabase
npm install
npm run dev
```

## База данных

Таблицы создаются миграцией `supabase/migrations/20261114120000_init.sql`:

```bash
supabase login
supabase link --project-ref <ref-проекта>
supabase db push
```

Сделать себя админом (Supabase → SQL Editor), после первого входа:

```sql
update public.profiles set role = 'admin' where email = 'твоя@почта';
```
