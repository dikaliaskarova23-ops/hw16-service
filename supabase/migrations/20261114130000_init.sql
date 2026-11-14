-- Платёжный календарь: профили с ролями, периоды (календари) и операции (платежи/поступления).

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

-- Проверка роли на стороне базы (security definer, чтобы не зациклиться на RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;

create policy "Свой профиль или админ видит все"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Менять роль может только админ: у обычного пользователя нет update вообще.
create policy "Только админ меняет профили"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Периоды (сущность «период»: один календарь на месяц/квартал вместо копий таблиц) ---
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  opening_balance numeric(14, 2) not null default 0,  -- остаток денег на начало периода
  currency text not null default 'KZT',
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 366)
);

create index periods_user_idx on public.periods (user_id, starts_on desc);

alter table public.periods enable row level security;

create policy "Свои периоды или админ"
  on public.periods for select using (user_id = auth.uid() or public.is_admin());
create policy "Создавать свои периоды"
  on public.periods for insert with check (user_id = auth.uid());
create policy "Менять свои периоды или админ"
  on public.periods for update using (user_id = auth.uid() or public.is_admin());
create policy "Удалять свои периоды или админ"
  on public.periods for delete using (user_id = auth.uid() or public.is_admin());

-- 3. Операции: планируемые поступления и платежи ----------------------------
create table public.operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  op_date date not null,
  kind text not null check (kind in ('inflow', 'outflow')),  -- поступление / платёж
  category text not null check (char_length(category) between 1 and 80),
  counterparty text check (char_length(counterparty) <= 120),
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'planned' check (status in ('planned', 'done')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index operations_period_date_idx on public.operations (period_id, op_date);

alter table public.operations enable row level security;

create policy "Свои операции или админ"
  on public.operations for select using (user_id = auth.uid() or public.is_admin());
create policy "Создавать свои операции в своём периоде"
  on public.operations for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.periods p where p.id = period_id and p.user_id = auth.uid())
  );
create policy "Менять свои операции или админ"
  on public.operations for update using (user_id = auth.uid() or public.is_admin());
create policy "Удалять свои операции или админ"
  on public.operations for delete using (user_id = auth.uid() or public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger operations_touch
  before update on public.operations
  for each row execute function public.touch_updated_at();
