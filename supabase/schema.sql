-- Sorella secure catalog schema
-- Ejecutar en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  image_url text not null default '/products/noir.svg',
  colors text[] not null default '{}',
  featured boolean not null default false,
  visible boolean not null default true,
  in_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  stock integer not null default 0 check (stock >= 0),
  updated_at timestamptz not null default now()
);

-- SECURITY DEFINER avoids recursive RLS checks on user_roles.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'moderator'
  );
$$;

revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to authenticated;

create or replace function public.sync_product_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products
  set in_stock = (new.stock > 0), updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_sync_stock on public.inventory;
create trigger inventory_sync_stock
after insert or update of stock on public.inventory
for each row execute function public.sync_product_stock();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_touch_updated_at on public.inventory;
create trigger inventory_touch_updated_at
before update on public.inventory
for each row execute function public.touch_updated_at();

alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;

-- Remove broad default privileges, then grant only what the API needs.
revoke all on public.user_roles from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.inventory from anon, authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;

-- Public visitors only see products that moderators explicitly marked visible.
drop policy if exists "public read visible products" on public.products;
create policy "public read visible products"
on public.products for select
to anon, authenticated
using (visible = true);

drop policy if exists "moderators read all products" on public.products;
create policy "moderators read all products"
on public.products for select
to authenticated
using (public.is_moderator());

-- All writes are enforced by the database, not by hiding buttons in React.
drop policy if exists "moderators insert products" on public.products;
create policy "moderators insert products"
on public.products for insert
to authenticated
with check (public.is_moderator());

drop policy if exists "moderators update products" on public.products;
create policy "moderators update products"
on public.products for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

drop policy if exists "moderators delete products" on public.products;
create policy "moderators delete products"
on public.products for delete
to authenticated
using (public.is_moderator());

drop policy if exists "moderators read inventory" on public.inventory;
create policy "moderators read inventory"
on public.inventory for select
to authenticated
using (public.is_moderator());

drop policy if exists "moderators insert inventory" on public.inventory;
create policy "moderators insert inventory"
on public.inventory for insert
to authenticated
with check (public.is_moderator());

drop policy if exists "moderators update inventory" on public.inventory;
create policy "moderators update inventory"
on public.inventory for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

drop policy if exists "moderators delete inventory" on public.inventory;
create policy "moderators delete inventory"
on public.inventory for delete
to authenticated
using (public.is_moderator());

-- Nobody reads user_roles directly from the browser. is_moderator() is the narrow interface.
-- No grants means API queries to this table are denied.

-- Public product image bucket: images can be viewed by everyone, but only moderators can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moderators upload product images" on storage.objects;
create policy "moderators upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_moderator());

drop policy if exists "moderators update product images" on storage.objects;
create policy "moderators update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_moderator())
with check (bucket_id = 'product-images' and public.is_moderator());

drop policy if exists "moderators delete product images" on storage.objects;
create policy "moderators delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_moderator());

-- After creating a user in Authentication > Users, make them moderator with:
-- insert into public.user_roles (user_id, role)
-- values ('UUID-DEL-USUARIO', 'moderator');
-- Sorella upgrade: galería, analytics y MFA obligatorio para moderadores.
-- Ejecutar una sola vez en Supabase > SQL Editor. Es idempotente.

create extension if not exists pgcrypto;

-- =========================================================
-- MFA / ROLES
-- =========================================================

create or replace function public.has_moderator_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'moderator'
  );
$$;

revoke all on function public.has_moderator_role() from public;
grant execute on function public.has_moderator_role() to authenticated;

-- Esta función es la que usan las políticas sensibles.
-- Un moderador solo cuenta como autorizado cuando su JWT está en AAL2 (2FA verificado).
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_moderator_role()
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2';
$$;

revoke all on function public.is_moderator() from public;
grant execute on function public.is_moderator() to authenticated;

-- =========================================================
-- MÚLTIPLES IMÁGENES POR PRODUCTO
-- =========================================================

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text not null unique,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_position_idx
on public.product_images(product_id, position);

alter table public.product_images enable row level security;
revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

drop policy if exists "public read visible product images" on public.product_images;
create policy "public read visible product images"
on public.product_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.visible = true
  )
);

drop policy if exists "moderators read all product images" on public.product_images;
create policy "moderators read all product images"
on public.product_images for select
to authenticated
using (public.is_moderator());

drop policy if exists "moderators insert product images" on public.product_images;
create policy "moderators insert product images"
on public.product_images for insert
to authenticated
with check (public.is_moderator());

drop policy if exists "moderators update product images" on public.product_images;
create policy "moderators update product images"
on public.product_images for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

drop policy if exists "moderators delete product images" on public.product_images;
create policy "moderators delete product images"
on public.product_images for delete
to authenticated
using (public.is_moderator());

-- =========================================================
-- ANALYTICS ANÓNIMAS
-- =========================================================

create table if not exists public.analytics_events (
  id bigint generated by default as identity primary key,
  visitor_id uuid not null,
  event_type text not null check (
    event_type in ('page_view', 'product_view', 'whatsapp_click', 'instagram_click')
  ),
  product_id uuid references public.products(id) on delete set null,
  path text check (path is null or char_length(path) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists analytics_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_event_type_idx on public.analytics_events(event_type);
create index if not exists analytics_product_id_idx on public.analytics_events(product_id);
create index if not exists analytics_visitor_id_idx on public.analytics_events(visitor_id);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant usage, select on sequence public.analytics_events_id_seq to anon, authenticated;

drop policy if exists "visitors can create analytics events" on public.analytics_events;
create policy "visitors can create analytics events"
on public.analytics_events for insert
to anon, authenticated
with check (
  visitor_id is not null
  and (product_id is null or exists (
    select 1 from public.products
    where products.id = analytics_events.product_id
      and products.visible = true
  ))
);

drop policy if exists "moderators can read analytics" on public.analytics_events;
create policy "moderators can read analytics"
on public.analytics_events for select
to authenticated
using (public.is_moderator());

-- Agregación server-side: evita descargar todos los eventos al navegador del admin.
create or replace function public.get_admin_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_days integer := greatest(7, least(coalesce(p_days, 30), 90));
  range_start timestamptz := (current_date - (greatest(7, least(coalesce(p_days, 30), 90)) - 1))::timestamptz;
  result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'MFA de moderador requerida' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'period_days', safe_days,
    'page_views', count(*) filter (where event_type = 'page_view'),
    'unique_visitors', count(distinct visitor_id),
    'product_views', count(*) filter (where event_type = 'product_view'),
    'whatsapp_clicks', count(*) filter (where event_type = 'whatsapp_click'),
    'instagram_clicks', count(*) filter (where event_type = 'instagram_click'),
    'today_views', count(*) filter (where event_type = 'page_view' and created_at >= current_date)
  )
  into result
  from public.analytics_events
  where created_at >= range_start;

  result := result || jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', to_char(day_value, 'YYYY-MM-DD'),
          'views', coalesce(stats.views, 0),
          'visitors', coalesce(stats.visitors, 0)
        ) order by day_value
      )
      from generate_series(
        current_date - (safe_days - 1),
        current_date,
        interval '1 day'
      ) as days(day_value)
      left join lateral (
        select
          count(*) filter (where ae.event_type = 'page_view') as views,
          count(distinct ae.visitor_id) filter (where ae.event_type = 'page_view') as visitors
        from public.analytics_events ae
        where ae.created_at >= day_value
          and ae.created_at < day_value + interval '1 day'
      ) stats on true
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.views desc, ranked.name)
      from (
        select
          p.id as product_id,
          p.name,
          p.image_url,
          count(ae.id) filter (where ae.event_type = 'product_view')::integer as views,
          count(ae.id) filter (where ae.event_type = 'whatsapp_click')::integer as whatsapp_clicks,
          count(ae.id) filter (where ae.event_type = 'instagram_click')::integer as instagram_clicks
        from public.products p
        left join public.analytics_events ae
          on ae.product_id = p.id
         and ae.created_at >= range_start
        group by p.id, p.name, p.image_url
        having count(ae.id) filter (where ae.event_type = 'product_view') > 0
        order by views desc, p.name
        limit 10
      ) ranked
    ), '[]'::jsonb)
  );

  return result;
end;
$$;

revoke all on function public.get_admin_analytics(integer) from public;
grant execute on function public.get_admin_analytics(integer) to authenticated;

-- Storage ya existente: sus políticas ahora heredan la nueva is_moderator() y exigen AAL2.
