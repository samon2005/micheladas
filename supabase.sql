-- Esquema de la app (ya aplicado en el proyecto Supabase kasa_diamante).
-- Las tablas usan el prefijo mic_ para no chocar con las de Kasa Diamante.
-- Solo vuelve a ejecutarlo si montas la app en un proyecto Supabase nuevo.

create table public.mic_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  full_name text not null,
  email text,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  active boolean not null default false
);

create table public.mic_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  category text,
  icon text,
  color text,
  active boolean not null default true,
  created_by uuid default auth.uid() references public.mic_profiles(id) on delete set null
);

create table public.mic_sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid default auth.uid() references public.mic_profiles(id) on delete set null,
  seller_name text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null check (total >= 0),
  method text not null check (method in ('efectivo', 'transferencia')),
  note text
);

create table public.mic_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.mic_profiles(id) on delete set null,
  created_by_name text,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text,
  method text not null check (method in ('efectivo', 'transferencia'))
);

create index mic_sales_created_at_idx on public.mic_sales (created_at desc);
create index mic_sales_seller_idx on public.mic_sales (seller_id);
create index mic_expenses_created_at_idx on public.mic_expenses (created_at desc);
create index mic_expenses_created_by_idx on public.mic_expenses (created_by);
create index mic_products_created_by_idx on public.mic_products (created_by);

create or replace function public.mic_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mic_profiles where id = (select auth.uid()) and active);
$$;

create or replace function public.mic_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mic_profiles where id = (select auth.uid()) and active and role = 'admin');
$$;

-- El primer usuario que se registra es admin; los siguientes quedan como vendedor pendiente de aprobación
create or replace function public.mic_register(p_full_name text) returns public.mic_profiles
language plpgsql security definer set search_path = '' as $$
declare
  v public.mic_profiles;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v from public.mic_profiles where id = v_uid;
  if found then return v; end if;

  lock table public.mic_profiles in share row exclusive mode;
  if not exists (select 1 from public.mic_profiles where role = 'admin') then
    insert into public.mic_profiles (id, full_name, email, role, active)
    values (v_uid, coalesce(nullif(trim(p_full_name), ''), 'Admin'), (select email from auth.users where id = v_uid), 'admin', true)
    returning * into v;
  else
    insert into public.mic_profiles (id, full_name, email, role, active)
    values (v_uid, coalesce(nullif(trim(p_full_name), ''), 'Vendedor'), (select email from auth.users where id = v_uid), 'vendedor', false)
    returning * into v;
  end if;
  return v;
end;
$$;

create or replace function public.mic_stamp_seller() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.seller_id := auth.uid();
  new.seller_name := (select full_name from public.mic_profiles where id = auth.uid());
  return new;
end;
$$;

create or replace function public.mic_stamp_expense() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := auth.uid();
  new.created_by_name := (select full_name from public.mic_profiles where id = auth.uid());
  return new;
end;
$$;

create or replace function public.mic_stamp_product() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger mic_sales_stamp before insert on public.mic_sales for each row execute function public.mic_stamp_seller();
create trigger mic_expenses_stamp before insert on public.mic_expenses for each row execute function public.mic_stamp_expense();
create trigger mic_products_stamp before insert on public.mic_products for each row execute function public.mic_stamp_product();

revoke execute on function public.mic_register(text) from public, anon;
grant execute on function public.mic_register(text) to authenticated;
revoke execute on function public.mic_is_active() from public, anon;
revoke execute on function public.mic_is_admin() from public, anon;
grant execute on function public.mic_is_active() to authenticated;
grant execute on function public.mic_is_admin() to authenticated;
revoke execute on function public.mic_stamp_seller() from public, anon, authenticated;
revoke execute on function public.mic_stamp_expense() from public, anon, authenticated;
revoke execute on function public.mic_stamp_product() from public, anon, authenticated;

alter table public.mic_profiles enable row level security;
alter table public.mic_products enable row level security;
alter table public.mic_sales enable row level security;
alter table public.mic_expenses enable row level security;

revoke all on public.mic_profiles, public.mic_products, public.mic_sales, public.mic_expenses from anon;

create policy mic_profiles_select on public.mic_profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.mic_is_admin()));
create policy mic_profiles_update on public.mic_profiles for update to authenticated
  using ((select public.mic_is_admin())) with check ((select public.mic_is_admin()));
create policy mic_profiles_delete on public.mic_profiles for delete to authenticated
  using ((select public.mic_is_admin()) and id <> (select auth.uid()));

create policy mic_products_select on public.mic_products for select to authenticated
  using ((select public.mic_is_active()));
create policy mic_products_insert on public.mic_products for insert to authenticated
  with check ((select public.mic_is_active()));
create policy mic_products_update on public.mic_products for update to authenticated
  using ((select public.mic_is_active())) with check ((select public.mic_is_active()));
create policy mic_products_delete on public.mic_products for delete to authenticated
  using ((select public.mic_is_admin()) or created_by = (select auth.uid()));

create policy mic_sales_select on public.mic_sales for select to authenticated
  using ((select public.mic_is_admin()) or (seller_id = (select auth.uid()) and (select public.mic_is_active())));
create policy mic_sales_insert on public.mic_sales for insert to authenticated
  with check ((select public.mic_is_active()));
create policy mic_sales_update on public.mic_sales for update to authenticated
  using ((select public.mic_is_admin())) with check ((select public.mic_is_admin()));
create policy mic_sales_delete on public.mic_sales for delete to authenticated
  using ((select public.mic_is_admin())
    or (seller_id = (select auth.uid()) and created_at > now() - interval '15 minutes'));

create policy mic_expenses_select on public.mic_expenses for select to authenticated
  using ((select public.mic_is_admin()) or (created_by = (select auth.uid()) and (select public.mic_is_active())));
create policy mic_expenses_insert on public.mic_expenses for insert to authenticated
  with check ((select public.mic_is_active()));
create policy mic_expenses_update on public.mic_expenses for update to authenticated
  using ((select public.mic_is_admin())) with check ((select public.mic_is_admin()));
create policy mic_expenses_delete on public.mic_expenses for delete to authenticated
  using ((select public.mic_is_admin())
    or (created_by = (select auth.uid()) and created_at > now() - interval '15 minutes'));

alter publication supabase_realtime add table public.mic_profiles, public.mic_products, public.mic_sales, public.mic_expenses;
