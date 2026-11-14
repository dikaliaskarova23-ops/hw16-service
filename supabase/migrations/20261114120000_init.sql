-- Трекер дедлайнов: профили с ролями, семестры (период) и задания.

-- 1. Профили и роли -------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Профиль создаётся автоматически при первом входе (Google или почта).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Проверка роли на стороне базы. security definer, чтобы не зациклиться на RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "Свой профиль или админ видит все"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Менять роль может только админ. Обычный пользователь update не может вообще,
-- поэтому сам себе роль admin не выдаст.
create policy "Только админ меняет профили"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Семестры (сущность «период», вместо копий таблиц на каждый семестр) ---
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.semesters enable row level security;

create policy "Свои семестры или админ"
  on public.semesters for select
  using (user_id = auth.uid() or public.is_admin());
create policy "Создавать свои семестры"
  on public.semesters for insert
  with check (user_id = auth.uid());
create policy "Менять свои семестры или админ"
  on public.semesters for update
  using (user_id = auth.uid() or public.is_admin());
create policy "Удалять свои семестры или админ"
  on public.semesters for delete
  using (user_id = auth.uid() or public.is_admin());

-- 3. Задания ---------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semester_id uuid references public.semesters (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 80),
  title text not null check (char_length(title) between 1 and 200),
  deadline timestamptz not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_user_deadline_idx on public.assignments (user_id, deadline);
create index assignments_semester_idx on public.assignments (semester_id);

alter table public.assignments enable row level security;

create policy "Свои задания или админ"
  on public.assignments for select
  using (user_id = auth.uid() or public.is_admin());
create policy "Создавать свои задания"
  on public.assignments for insert
  with check (user_id = auth.uid());
create policy "Менять свои задания или админ"
  on public.assignments for update
  using (user_id = auth.uid() or public.is_admin());
create policy "Удалять свои задания или админ"
  on public.assignments for delete
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assignments_touch
  before update on public.assignments
  for each row execute function public.touch_updated_at();
