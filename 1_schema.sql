-- ============================================================================
--  CAFÉ DUGOUT — SCHÉMA SUPABASE (partie 1/2 : structure + sécurité)
--  À coller dans : Supabase Dashboard > SQL Editor > New query > Run
--  Ce script est idempotent : on peut le relancer sans casser les données.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TYPES
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('admin', 'gerant', 'serveur', 'cuisine');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('attente', 'pret', 'servi', 'annule');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('bankily', 'masrivi', 'sedad', 'click', 'especes');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

-- 2.1 Personnel : 1 ligne = 1 compte Supabase Auth + son rôle.
--     Le rôle n'est JAMAIS décidé par le navigateur : il vient d'ici.
create table if not exists public.staff (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default 'Employé',
  role       public.staff_role not null default 'serveur',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2.2 Tables du restaurant (le QR encode code + qr_token)
create table if not exists public.resto_tables (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                       -- 'T01' ... 'T20', 'EMP'
  label      text not null,                              -- 'Table 1', 'À emporter'
  seats      smallint not null default 4 check (seats between 1 and 50),
  qr_token   uuid not null unique default gen_random_uuid(),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint resto_tables_code_format check (code ~ '^[A-Z0-9]{2,8}$')
);

-- 2.3 Catégories du menu
create table if not exists public.categories (
  slug       text primary key,
  label      text not null,
  sort_order smallint not null default 0
);

-- 2.4 Produits (le PRIX fait foi ici, jamais dans le navigateur)
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  description   text check (char_length(description) <= 300),
  category_slug text not null references public.categories (slug) on update cascade,
  price         numeric(10, 2) not null check (price > 0 and price <= 100000),
  image_url     text,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists menu_items_cat_idx on public.menu_items (category_slug, sort_order);

-- 2.5 Commandes : une seule commande "ouverte" par table (index unique partiel)
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  order_no   bigint generated always as identity,
  table_id   uuid not null references public.resto_tables (id) on delete restrict,
  status     public.order_status not null default 'attente',
  channel    text not null default 'client' check (channel in ('client', 'serveur')),
  note       text check (char_length(note) <= 300),
  subtotal   numeric(10, 2) not null default 0 check (subtotal >= 0),
  created_by uuid references public.staff (id) on delete set null,
  opened_at  timestamptz not null default now(),
  closed_at  timestamptz
);
create unique index if not exists orders_one_open_per_table
  on public.orders (table_id)
  where (status <> 'annule' and closed_at is null);
create index if not exists orders_opened_idx on public.orders (opened_at desc);

-- 2.6 Lignes de commande (prix recopié = "snapshot", le menu peut changer après)
create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name_snapshot text not null,
  unit_price   numeric(10, 2) not null check (unit_price >= 0),
  qty          smallint not null check (qty between 1 and 99),
  note         text check (char_length(note) <= 200),
  line_total   numeric(10, 2) generated always as (round(unit_price * qty, 2)) stored
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create unique index if not exists order_items_merge_idx
  on public.order_items (order_id, menu_item_id, coalesce(note, ''));

-- 2.7 Paiements (plusieurs paiements possibles pour une même table)
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  method      public.payment_method not null,
  phone       text check (phone is null or phone ~ '^[0-9+ ]{6,20}$'),
  received_by uuid references public.staff (id) on delete set null,
  paid_at     timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_paid_at_idx on public.payments (paid_at desc);

-- 2.8 Dépenses (achats, salaires, gaz, etc.)
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  label      text not null check (char_length(btrim(label)) between 1 and 120),
  amount     numeric(10, 2) not null check (amount > 0),
  spent_at   timestamptz not null default now(),
  created_by uuid references public.staff (id) on delete set null
);
create index if not exists expenses_spent_idx on public.expenses (spent_at desc);

-- 2.9 Réglages (nom du resto, devise…) — une seule ligne
create table if not exists public.settings (
  id         smallint primary key default 1 check (id = 1),
  brand_name text not null default 'Café DUGOUT',
  brand_ar   text not null default 'مقهى سنترال',
  tagline    text not null default 'Grillades, Volailles & Spécialités • Nouakchott',
  currency   text not null default 'MRU',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 2.10 Anti-spam pour les appels publics (scan QR = anonyme)
create table if not exists public.client_throttle (
  id          bigserial primary key,
  fingerprint text not null,
  created_at  timestamptz not null default now()
);
create index if not exists client_throttle_idx on public.client_throttle (fingerprint, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. FONCTIONS UTILITAIRES (rôle réel de l'utilisateur connecté)
-- ----------------------------------------------------------------------------
create or replace function public.current_staff_role()
returns public.staff_role
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.role from public.staff s where s.id = (select auth.uid()) and s.is_active
$$;

create or replace function public.has_role(p_roles public.staff_role[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.is_active and s.role = any (p_roles)
  )
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_role(array['admin']::public.staff_role[]) $$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_role(array['admin','gerant']::public.staff_role[]) $$;

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_role(array['admin','gerant','serveur','cuisine']::public.staff_role[]) $$;

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS
-- ----------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
  for each row execute function public.tg_touch_updated_at();

-- 4.1 Le total de la commande est TOUJOURS recalculé en base
create or replace function public.tg_recalc_subtotal() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
     set subtotal = coalesce((select sum(i.line_total) from public.order_items i where i.order_id = v_order), 0)
   where o.id = v_order;
  return null;
end $$;

drop trigger if exists order_items_recalc on public.order_items;
create trigger order_items_recalc after insert or update or delete on public.order_items
  for each row execute function public.tg_recalc_subtotal();

-- 4.2 Une commande soldée se ferme automatiquement (libère/reprend la table)
create or replace function public.tg_close_when_paid() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total numeric; v_paid numeric;
begin
  select o.subtotal into v_total from public.orders o where o.id = new.order_id;
  select coalesce(sum(p.amount), 0) into v_paid from public.payments p where p.order_id = new.order_id;
  if v_total is not null and v_paid >= v_total then
    update public.orders set closed_at = now() where id = new.order_id and closed_at is null;
  end if;
  return null;
end $$;

drop trigger if exists payments_close_order on public.payments;
create trigger payments_close_order after insert on public.payments
  for each row execute function public.tg_close_when_paid();

-- ----------------------------------------------------------------------------
-- 5. FONCTIONS MÉTIER (le navigateur n'écrit jamais directement dans les tables)
-- ----------------------------------------------------------------------------

-- 5.1 Anti-spam : vrai si l'appelant dépasse N appels / fenêtre
create or replace function public.check_throttle(p_key text, p_max integer default 12, p_window interval default '1 minute')
returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_ip text; v_fp text; v_count integer;
begin
  begin
    v_ip := coalesce(
      current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      'unknown');
  exception when others then v_ip := 'unknown';
  end;
  v_fp := md5(coalesce(v_ip, 'unknown') || '|' || p_key);

  select count(*) into v_count
    from public.client_throttle
   where fingerprint = v_fp and created_at > now() - p_window;

  if v_count >= p_max then
    return false;
  end if;

  insert into public.client_throttle (fingerprint) values (v_fp);
  if random() < 0.02 then
    delete from public.client_throttle where created_at < now() - interval '1 day';
  end if;
  return true;
end $$;

-- 5.2 Cœur commun : ajouter des lignes à la commande ouverte d'une table.
--     p_items = [{"menu_item_id":"uuid","qty":2,"note":"sans piment"}, ...]
--     Le prix est relu dans menu_items : impossible de le falsifier côté client.
create or replace function public.place_order_core(
  p_table_id uuid,
  p_items    jsonb,
  p_note     text,
  p_channel  text,
  p_staff    uuid
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order uuid;
  v_item  jsonb;
  v_menu  public.menu_items;
  v_qty   smallint;
  v_note  text;
  v_total_qty integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Aucun article dans la commande' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'Trop d''articles différents (40 max)' using errcode = '22023';
  end if;

  perform 1 from public.resto_tables t where t.id = p_table_id and t.is_active;
  if not found then
    raise exception 'Table inconnue ou désactivée' using errcode = '22023';
  end if;

  insert into public.orders (table_id, status, channel, note, created_by)
  values (p_table_id, 'attente', p_channel, nullif(btrim(coalesce(p_note, '')), ''), p_staff)
  on conflict (table_id) where (status <> 'annule' and closed_at is null) do nothing
  returning id into v_order;

  if v_order is null then
    select o.id into v_order
      from public.orders o
     where o.table_id = p_table_id and o.status <> 'annule' and o.closed_at is null
     limit 1;
    update public.orders set status = 'attente' where id = v_order and status = 'servi';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    continue when v_item ->> 'menu_item_id' is null;
    select * into v_menu from public.menu_items m where m.id = (v_item ->> 'menu_item_id')::uuid;
    if v_menu.id is null then
      raise exception 'Produit introuvable: %', v_item ->> 'menu_item_id' using errcode = '22023';
    end if;
    if not v_menu.is_available then
      raise exception 'Produit indisponible: %', v_menu.name using errcode = '22023';
    end if;

    v_qty := least(greatest(coalesce((v_item ->> 'qty')::smallint, 1), 1), 99);
    v_note := nullif(btrim(coalesce(v_item ->> 'note', '')), '');
    if v_note is not null and char_length(v_note) > 200 then
      v_note := left(v_note, 200);
    end if;

    begin
      insert into public.order_items (order_id, menu_item_id, name_snapshot, unit_price, qty, note)
      values (v_order, v_menu.id, v_menu.name, v_menu.price, v_qty, v_note);
    exception when unique_violation then
      update public.order_items i
         set qty = least(i.qty + v_qty, 99)
       where i.order_id = v_order and i.menu_item_id = v_menu.id and coalesce(i.note, '') = coalesce(v_note, '');
    end;
  end loop;

  select coalesce(sum(i.qty), 0) into v_total_qty from public.order_items i where i.order_id = v_order;
  if v_total_qty > 100 then
    raise exception 'Commande trop volumineuse : appelez le serveur' using errcode = '22023';
  end if;

  return v_order;
end $$;

-- 5.3 API publique (anon) : le client scanne le QR -> table identifiée par son jeton
create or replace function public.client_table_info(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables;
begin
  select * into t from public.resto_tables where qr_token = p_token and is_active;
  if t.id is null then
    return null;
  end if;
  return jsonb_build_object('code', t.code, 'label', t.label, 'seats', t.seats);
end $$;

create or replace function public.client_open_order(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables; v jsonb;
begin
  select * into t from public.resto_tables where qr_token = p_token and is_active;
  if t.id is null then
    raise exception 'QR invalide' using errcode = '22023';
  end if;

  select to_jsonb(x) into v from (
    select o.id, o.status, o.subtotal, o.opened_at,
           coalesce((select jsonb_agg(jsonb_build_object(
                      'id', i.id, 'menu_item_id', i.menu_item_id, 'name', i.name_snapshot,
                      'price', i.unit_price, 'qty', i.qty, 'note', i.note) order by i.name_snapshot)
                     from public.order_items i where i.order_id = o.id), '[]'::jsonb) as items,
           coalesce((select sum(p.amount) from public.payments p where p.order_id = o.id), 0) as paid
      from public.orders o
     where o.table_id = t.id and o.status <> 'annule' and o.closed_at is null
     limit 1
  ) x;
  return v;
end $$;

create or replace function public.client_place_order(p_token uuid, p_items jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables; v_order uuid;
begin
  select * into t from public.resto_tables where qr_token = p_token and is_active;
  if t.id is null then
    raise exception 'QR invalide' using errcode = '22023';
  end if;
  if not public.check_throttle(t.code, 12, '1 minute') then
    raise exception 'Trop de commandes envoyées. Patientez une minute.' using errcode = '22023';
  end if;

  v_order := public.place_order_core(t.id, p_items, p_note, 'client', null);
  return jsonb_build_object('order_id', v_order,
                            'order', public.client_open_order(p_token));
end $$;

-- 5.3b Variante SANS jeton : le client choisit sa table dans la liste.
--      (demandé pour les clients qui n'ont pas scanné le QR) — même sécurité de prix,
--      même anti-spam : le code de table est simplement résolu ici, en base.
create or replace function public._client_order_json(p_table_id uuid)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select to_jsonb(x) from (
    select o.id, o.status, o.subtotal, o.opened_at,
           coalesce((select jsonb_agg(jsonb_build_object(
                      'id', i.id, 'menu_item_id', i.menu_item_id, 'name', i.name_snapshot,
                      'price', i.unit_price, 'qty', i.qty, 'note', i.note) order by i.name_snapshot)
                     from public.order_items i where i.order_id = o.id), '[]'::jsonb) as items,
           coalesce((select sum(p.amount) from public.payments p where p.order_id = o.id), 0) as paid
      from public.orders o
     where o.table_id = p_table_id and o.status <> 'annule' and o.closed_at is null
     limit 1
  ) x
$$;

create or replace function public.client_open_order_by_table(p_code text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables;
begin
  select * into t from public.resto_tables where code = upper(btrim(coalesce(p_code, ''))) and is_active;
  if t.id is null then
    raise exception 'Table inconnue' using errcode = '22023';
  end if;
  return public._client_order_json(t.id);
end $$;

create or replace function public.client_place_order_by_table(p_code text, p_items jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables; v_order uuid;
begin
  select * into t from public.resto_tables where code = upper(btrim(coalesce(p_code, ''))) and is_active;
  if t.id is null then
    raise exception 'Table inconnue ou fermée' using errcode = '22023';
  end if;
  if not public.check_throttle('T:' || t.code, 12, '1 minute') then
    raise exception 'Trop de commandes envoyées. Patientez une minute.' using errcode = '22023';
  end if;
  v_order := public.place_order_core(t.id, p_items, p_note, 'client', null);
  return jsonb_build_object('order_id', v_order, 'order', public._client_order_json(t.id));
end $$;

revoke all on function public._client_order_json(uuid) from public, anon, authenticated;
revoke all on function public.client_open_order_by_table(text) from public;
revoke all on function public.client_place_order_by_table(text, jsonb, text) from public;
grant execute on function public.client_open_order_by_table(text) to anon, authenticated;
grant execute on function public.client_place_order_by_table(text, jsonb, text) to anon, authenticated;

-- 5.4 API équipe (authenticated + rôle) : commande prise par un serveur
create or replace function public.staff_place_order(p_table_code text, p_items jsonb, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables;
begin
  if not public.is_team() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  select * into t from public.resto_tables where code = upper(p_table_code);
  if t.id is null then
    raise exception 'Table inconnue: %', p_table_code using errcode = '22023';
  end if;
  return public.place_order_core(t.id, p_items, p_note, 'serveur', (select auth.uid()));
end $$;

-- 5.5 Changer le statut (Attente -> Prêt -> Servi)
create or replace function public.staff_set_status(p_order uuid, p_status public.order_status)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.has_role(array['admin','gerant','serveur','cuisine']::public.staff_role[]) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  update public.orders set status = p_status where id = p_order;
  if p_status = 'annule' then
    update public.orders set closed_at = now() where id = p_order and closed_at is null;
  end if;
end $$;

-- 5.6 Modifier la quantité d'une ligne / supprimer une ligne
create or replace function public.staff_set_item_qty(p_item uuid, p_qty smallint)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.has_role(array['admin','gerant','serveur']::public.staff_role[]) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  if p_qty is null or p_qty <= 0 then
    delete from public.order_items where id = p_item;
  else
    update public.order_items set qty = least(p_qty, 99) where id = p_item;
  end if;
end $$;

-- 5.7 Encaisser (contrôle : jamais plus que le reste à payer)
create or replace function public.staff_record_payment(p_order uuid, p_amount numeric, p_method public.payment_method, p_phone text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total numeric; v_paid numeric; v_left numeric;
begin
  if not public.has_role(array['admin','gerant','serveur']::public.staff_role[]) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  select o.subtotal into v_total from public.orders o where o.id = p_order and o.status <> 'annule';
  if v_total is null then
    raise exception 'Commande inconnue ou annulée' using errcode = '22023';
  end if;

  select coalesce(sum(p.amount), 0) into v_paid from public.payments p where p.order_id = p_order;
  v_left := v_total - v_paid;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = '22023';
  end if;
  if p_amount > v_left + 0.01 then
    raise exception 'Montant supérieur au reste à payer (% MRU)', round(v_left, 2) using errcode = '22023';
  end if;

  insert into public.payments (order_id, amount, method, phone, received_by)
  values (p_order, round(p_amount, 2), p_method, nullif(btrim(coalesce(p_phone, '')), ''), (select auth.uid()));

  return jsonb_build_object('paid', v_paid + round(p_amount, 2),
                            'left', round(greatest(v_left - p_amount, 0), 2));
end $$;

-- 5.7b Déplacer une commande ouverte vers une autre table
create or replace function public.staff_move_order(p_order uuid, p_table_code text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_target public.resto_tables; v_busy uuid;
begin
  if not public.is_team() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  if p_order is null or not exists (select 1 from public.orders o where o.id = p_order) then
    raise exception 'Commande inconnue' using errcode = '22023';
  end if;
  select * into v_target from public.resto_tables where code = upper(p_table_code) and is_active;
  if v_target.id is null then
    raise exception 'Table inconnue: %', p_table_code using errcode = '22023';
  end if;
  select o.id into v_busy from public.orders o
   where o.table_id = v_target.id and o.status <> 'annule' and o.closed_at is null and o.id <> p_order
   limit 1;
  if v_busy is not null then
    raise exception 'La table % a déjà une commande en cours', v_target.label using errcode = '22023';
  end if;
  update public.orders set table_id = v_target.id where id = p_order;
end $$;

-- 5.8 Annuler / supprimer une commande (admin ou gérant)
create or replace function public.staff_cancel_order(p_order uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_manager() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  update public.orders set status = 'annule', closed_at = now() where id = p_order;
end $$;

create or replace function public.staff_delete_order(p_order uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_paid numeric;
begin
  if not public.is_manager() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  select coalesce(sum(p.amount), 0) into v_paid from public.payments p where p.order_id = p_order;
  if v_paid > 0 and not public.is_admin() then
    raise exception 'Commande déjà encaissée : réservé à l''admin' using errcode = '42501';
  end if;
  delete from public.orders where id = p_order;
end $$;

-- 5.9 Purger l'historique (admin seulement, et jamais les commandes du jour non soldées)
create or replace function public.staff_purge_history(p_before timestamptz default now() - interval '30 days')
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  with d as (
    delete from public.orders
     where closed_at is not null and closed_at < p_before
     returning 1
  ) select count(*) into v_count from d;
  return v_count;
end $$;

-- 5.10 Donner un rôle à un compte déjà créé dans Authentication > Users
--      (à exécuter depuis le SQL Editor, jamais depuis le navigateur)
create or replace function public.promote_staff(p_email text, p_role public.staff_role, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_id uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'Aucun compte avec l''email % — créez-le d''abord dans Authentication > Users', p_email;
  end if;
  insert into public.staff (id, full_name, role, is_active)
  values (v_id, coalesce(nullif(btrim(p_name), ''), split_part(p_email, '@', 1)), p_role, true)
  on conflict (id) do update set role = excluded.role, is_active = true, full_name = coalesce(excluded.full_name, public.staff.full_name);
  return v_id;
end $$;

revoke all on function public.promote_staff(text, public.staff_role, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. VUES (lecture agrégée pour le tableau de bord)
-- ----------------------------------------------------------------------------
create or replace view public.v_orders_full with (security_invoker = true) as
select o.id,
       o.order_no,
       o.status,
       o.channel,
       o.subtotal,
       o.opened_at,
       o.closed_at,
       t.code  as table_code,
       t.label as table_label,
       coalesce((select jsonb_agg(jsonb_build_object(
                    'id', i.id, 'menu_item_id', i.menu_item_id, 'name', i.name_snapshot,
                    'price', i.unit_price, 'qty', i.qty, 'note', i.note) order by i.name_snapshot)
                 from public.order_items i where i.order_id = o.id), '[]'::jsonb) as items,
       coalesce((select sum(p.amount) from public.payments p where p.order_id = o.id), 0) as paid,
       coalesce((select jsonb_agg(jsonb_build_object(
                    'amt', p.amount, 'op', p.method, 'ph', p.phone, 't', p.paid_at) order by p.paid_at)
                 from public.payments p where p.order_id = o.id), '[]'::jsonb) as pays
  from public.orders o
  join public.resto_tables t on t.id = o.table_id;

-- Liste publique des tables : code + libellé UNIQUEMENT (jamais qr_token,
-- sinon n'importe qui pourrait commander à la place d'une autre table).
create or replace view public.v_tables_public as
select t.code, t.label, t.seats
  from public.resto_tables t
 where t.is_active;

create or replace view public.v_revenue_by_day with (security_invoker = true) as
select (p.paid_at at time zone 'Africa/Nouakchott')::date as day,
       sum(p.amount) filter (where p.method = 'especes') as cash,
       sum(p.amount) as total,
       count(*) as ticket_lines
  from public.payments p
 group by 1;

create or replace view public.v_revenue_by_method with (security_invoker = true) as
select p.method, sum(p.amount) as total, count(*) as n
  from public.payments p
 group by 1;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.staff           enable row level security;
alter table public.resto_tables    enable row level security;
alter table public.categories      enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;
alter table public.expenses        enable row level security;
alter table public.settings        enable row level security;
alter table public.client_throttle enable row level security;

-- Rien n'est lisible par défaut : on retire les droits, puis on les rend au cas par cas.
revoke all on all tables in schema public from anon, authenticated;
-- Les tables créées PLUS TARD ne seront pas ouvertes par défaut non plus.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- 7.1 staff : chacun voit sa ligne, l'admin voit tout
drop policy if exists staff_read_self on public.staff;
create policy staff_read_self on public.staff
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists staff_admin_write on public.staff;
create policy staff_admin_write on public.staff
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 7.2 categories / menu_items / resto_tables / settings : lecture publique du catalogue
grant select on public.categories, public.menu_items to anon, authenticated;
grant select on public.settings to anon, authenticated;
grant select on public.resto_tables to authenticated;

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);

drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists menu_read on public.menu_items;
create policy menu_read on public.menu_items for select to anon, authenticated
  using (is_available or public.is_team());

drop policy if exists menu_admin on public.menu_items;
create policy menu_admin on public.menu_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists tables_read on public.resto_tables;
-- Lu par l'équipe uniquement (contient qr_token). Les clients passent par v_tables_public
-- et par les fonctions client_* : le jeton n'est donc jamais exposé.
create policy tables_read on public.resto_tables for select to authenticated
  using (public.is_team());

drop policy if exists tables_admin on public.resto_tables;
create policy tables_admin on public.resto_tables for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated using (true);

drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 7.3 orders / order_items / payments : jamais d'accès direct pour anon.
--     Tout passe par les fonctions ci-dessus (SECURITY DEFINER + contrôles).
grant select on public.orders, public.order_items, public.payments to authenticated;

drop policy if exists orders_team on public.orders;
create policy orders_team on public.orders for select to authenticated
  using (public.is_team());

drop policy if exists order_items_team on public.order_items;
create policy order_items_team on public.order_items for select to authenticated
  using (public.is_team());

drop policy if exists payments_team on public.payments;
create policy payments_team on public.payments for select to authenticated
  using (public.has_role(array['admin','gerant']::public.staff_role[]));

-- 7.4 expenses : admin (écriture) / admin + gérant (lecture)
grant select, insert, update, delete on public.expenses to authenticated;

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated
  using (public.is_manager());

drop policy if exists expenses_admin_write on public.expenses;
create policy expenses_admin_write on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 7.5 Vues : on n'accorde l'accès qu'aux personnes connectées
grant select on public.v_tables_public to anon, authenticated;
grant select on public.v_orders_full, public.v_revenue_by_day, public.v_revenue_by_method to authenticated;

-- 7.6 client_throttle : personne (uniquement via les fonctions security definer)
-- ----------------------------------------------------------------------------
-- 8. DROITS D'EXÉCUTION DES FONCTIONS
-- ----------------------------------------------------------------------------
revoke all on function public.client_table_info(uuid) from public;
revoke all on function public.client_open_order(uuid) from public;
revoke all on function public.client_place_order(uuid, jsonb, text) from public;
revoke all on function public.place_order_core(uuid, jsonb, text, text, uuid) from public;
revoke all on function public.check_throttle(text, integer, interval) from public;
revoke all on function public.staff_place_order(text, jsonb, text) from public;
revoke all on function public.staff_set_status(uuid, public.order_status) from public;
revoke all on function public.staff_set_item_qty(uuid, smallint) from public;
revoke all on function public.staff_record_payment(uuid, numeric, public.payment_method, text) from public;
revoke all on function public.staff_move_order(uuid, text) from public;
revoke all on function public.staff_cancel_order(uuid) from public;
revoke all on function public.staff_delete_order(uuid) from public;
revoke all on function public.staff_purge_history(timestamptz) from public;

grant execute on function public.client_table_info(uuid) to anon, authenticated;
grant execute on function public.client_open_order(uuid) to anon, authenticated;
grant execute on function public.client_place_order(uuid, jsonb, text) to anon, authenticated;

grant execute on function public.staff_place_order(text, jsonb, text) to authenticated;
grant execute on function public.staff_set_status(uuid, public.order_status) to authenticated;
grant execute on function public.staff_set_item_qty(uuid, smallint) to authenticated;
grant execute on function public.staff_record_payment(uuid, numeric, public.payment_method, text) to authenticated;
grant execute on function public.staff_move_order(uuid, text) to authenticated;
grant execute on function public.staff_cancel_order(uuid) to authenticated;
grant execute on function public.staff_delete_order(uuid) to authenticated;
grant execute on function public.staff_purge_history(timestamptz) to authenticated;

-- place_order_core et check_throttle restent internes (non appelables depuis l'API)
revoke all on function public.place_order_core(uuid, jsonb, text, text, uuid) from anon, authenticated;
revoke all on function public.check_throttle(text, integer, interval) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. STORAGE (photos des plats)
--    Si cette section renvoie une erreur "must be owner of table objects" (cela dépend
--    des versions de Supabase), fais-le à la main : Storage > New bucket > "menu", Public,
--    puis Storage > Policies > New policy (lecture publique / écriture admin).
--    Bucket public en lecture (les images du menu sont visibles par les clients),
--    écriture réservée à l'admin, taille max 2 Mo, types image uniquement.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu', 'menu', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists menu_images_public_read on storage.objects;
create policy menu_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'menu');

drop policy if exists menu_images_admin_write on storage.objects;
create policy menu_images_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu' and public.is_admin());

drop policy if exists menu_images_admin_update on storage.objects;
create policy menu_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'menu' and public.is_admin());

drop policy if exists menu_images_admin_delete on storage.objects;
create policy menu_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu' and public.is_admin());
