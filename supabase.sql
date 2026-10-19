-- Ejecuta este script en Supabase > SQL Editor (solo una vez)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  category text,
  icon text,
  color text,
  active boolean not null default true
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null check (total >= 0),
  method text not null check (method in ('efectivo', 'transferencia')),
  note text
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text,
  method text not null check (method in ('efectivo', 'transferencia'))
);

create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists expenses_created_at_idx on public.expenses (created_at desc);

-- Acceso desde la app con la clave pública (anon).
-- Cualquiera que tenga la URL de Supabase y la clave pública podría leer/escribir:
-- usa VITE_APP_PIN y no compartas el enlace de la app públicamente.
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "app_all" on public.products;
drop policy if exists "app_all" on public.sales;
drop policy if exists "app_all" on public.expenses;

create policy "app_all" on public.products for all to anon using (true) with check (true);
create policy "app_all" on public.sales for all to anon using (true) with check (true);
create policy "app_all" on public.expenses for all to anon using (true) with check (true);
