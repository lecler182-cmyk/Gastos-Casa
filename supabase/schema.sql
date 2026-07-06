-- ============================================================
-- GASTOS CASA — Esquema completo para Supabase
-- Pega este archivo entero en: Supabase > SQL Editor > Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- TABLAS ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  household_id uuid,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestro hogar',
  currency text not null default 'EUR',
  -- porción del gasto compartido que paga quien creó el hogar (0.5 = 50/50)
  creator_share numeric not null default 0.5 check (creator_share > 0 and creator_share < 1),
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_household_fk
  foreign key (household_id) references public.households(id) on delete set null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text not null default '🧾',
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  category_id uuid references public.categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  note text,
  scope text not null default 'shared' check (scope in ('personal', 'shared')),
  created_at timestamptz not null default now()
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  amount numeric not null check (amount > 0),
  source text,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (household_id, category_id)
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  category_id uuid references public.categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  note text,
  scope text not null default 'shared' check (scope in ('personal', 'shared')),
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  last_generated date,
  created_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_user uuid not null references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index expenses_household_date_idx on public.expenses (household_id, date);
create index incomes_household_date_idx on public.incomes (household_id, date);

-- ---------- PERFIL AUTOMÁTICO AL REGISTRARSE ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- HELPER PARA RLS ----------

create or replace function public.my_household()
returns uuid
language sql stable security definer set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- ---------- FUNCIONES (RPC) ----------

-- Crear hogar + categorías por defecto
create or replace function public.create_household(p_name text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if (select household_id from profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a un hogar';
  end if;

  insert into households (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Nuestro hogar'), auth.uid())
  returning id into v_id;

  update profiles set household_id = v_id where id = auth.uid();

  insert into categories (household_id, name, icon, color) values
    (v_id, 'Supermercado',   '🛒', '#22c55e'),
    (v_id, 'Casa / Alquiler','🏠', '#3b82f6'),
    (v_id, 'Servicios',      '💡', '#eab308'),
    (v_id, 'Transporte',     '🚗', '#f97316'),
    (v_id, 'Ocio',           '🎉', '#a855f7'),
    (v_id, 'Restaurantes',   '🍽️', '#ef4444'),
    (v_id, 'Salud',          '💊', '#14b8a6'),
    (v_id, 'Ropa',           '👕', '#ec4899'),
    (v_id, 'Suscripciones',  '📺', '#6366f1'),
    (v_id, 'Otros',          '🧾', '#64748b');

  return v_id;
end;
$$;

-- Unirse a un hogar con código de invitación
create or replace function public.join_household(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if (select household_id from profiles where id = auth.uid()) is not null then
    raise exception 'Ya perteneces a un hogar';
  end if;

  select id into v_id from households where invite_code = lower(trim(p_code));
  if v_id is null then
    raise exception 'Código de invitación inválido';
  end if;

  if (select count(*) from profiles where household_id = v_id) >= 2 then
    raise exception 'Ese hogar ya tiene dos miembros';
  end if;

  update profiles set household_id = v_id where id = auth.uid();
  return v_id;
end;
$$;

-- Genera los gastos recurrentes pendientes del mes actual
create or replace function public.generate_recurring()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_house uuid;
begin
  select household_id into v_house from profiles where id = auth.uid();
  if v_house is null then return; end if;

  for r in
    select * from recurring_expenses
    where household_id = v_house
      and active
      and day_of_month <= extract(day from current_date)::int
      and (last_generated is null
           or date_trunc('month', last_generated) < date_trunc('month', current_date))
  loop
    insert into expenses (household_id, paid_by, category_id, amount, date, note, scope)
    values (
      r.household_id, r.paid_by, r.category_id, r.amount,
      make_date(extract(year from current_date)::int, extract(month from current_date)::int, r.day_of_month),
      trim(coalesce(r.note, '') || ' (recurrente)'),
      r.scope
    );
    update recurring_expenses set last_generated = current_date where id = r.id;
  end loop;
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.settlements enable row level security;

create policy "profiles: ver los del hogar" on public.profiles
  for select using (
    id = auth.uid()
    or (household_id is not null and household_id = public.my_household())
  );

create policy "profiles: editar el propio" on public.profiles
  for update using (id = auth.uid());

create policy "households: ver el propio" on public.households
  for select using (id = public.my_household());

create policy "households: editar el propio" on public.households
  for update using (id = public.my_household());

create policy "categories: todo dentro del hogar" on public.categories
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "expenses: todo dentro del hogar" on public.expenses
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "incomes: todo dentro del hogar" on public.incomes
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "budgets: todo dentro del hogar" on public.budgets
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "recurring: todo dentro del hogar" on public.recurring_expenses
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "settlements: todo dentro del hogar" on public.settlements
  for all using (household_id = public.my_household())
  with check (household_id = public.my_household());
