-- ============================================================================
-- CAFÉ DUGOUT — 6. Inventaire du magasin (entrées, sorties vers le restaurant, stock)
-- À exécuter une fois dans le SQL Editor (après 1_schema.sql). Réservé admin + gérant.
--
-- Principe : le stock n'est JAMAIS saisi à la main. Il est la somme d'un registre
-- de mouvements (stock_movements) qu'on ne modifie ni ne supprime :
--   entree     (+)  marchandise reçue au magasin (achat fournisseur)
--   sortie     (-)  marchandise sortie du magasin vers le restaurant (cuisine, bar, salle)
--   ajustement (±)  correction après comptage physique / casse / péremption
-- Une sortie supérieure au stock disponible est refusée par la base.
-- ============================================================================

create table if not exists public.stock_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  unit       text not null default 'unité' check (char_length(unit) between 1 and 20),
  category   text check (category is null or char_length(category) <= 40),
  min_qty    numeric(12,3) not null default 0 check (min_qty >= 0),   -- seuil d'alerte « stock bas »
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists stock_items_name_uq on public.stock_items (lower(btrim(name)));

create table if not exists public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.stock_items (id) on delete restrict,
  kind       text not null check (kind in ('entree', 'sortie', 'ajustement')),
  qty        numeric(12,3) not null check (qty <> 0),                  -- signée : + entrée, - sortie
  unit_cost  numeric(12,2) check (unit_cost is null or unit_cost >= 0), -- MRU / unité (entrées)
  party      text check (party is null or char_length(party) <= 80),   -- fournisseur (entrée) / destination (sortie)
  note       text check (note is null or char_length(note) <= 200),
  by_name    text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  moved_at   timestamptz not null default now(),
  constraint stock_sign_ck check ((kind = 'entree' and qty > 0) or (kind = 'sortie' and qty < 0) or kind = 'ajustement')
);
create index if not exists stock_movements_item_idx on public.stock_movements (item_id, moved_at desc);
create index if not exists stock_movements_date_idx on public.stock_movements (moved_at desc);

-- ---------------------------------------------------------------- sécurité (RLS)
alter table public.stock_items     enable row level security;
alter table public.stock_movements enable row level security;
revoke all on public.stock_items, public.stock_movements from anon;
revoke all on public.stock_items, public.stock_movements from authenticated;
grant select, insert, update on public.stock_items to authenticated;   -- pas de delete : on archive
grant select on public.stock_movements to authenticated;               -- écriture uniquement via les fonctions ci-dessous

drop policy if exists stock_items_read   on public.stock_items;
drop policy if exists stock_items_insert on public.stock_items;
drop policy if exists stock_items_update on public.stock_items;
create policy stock_items_read   on public.stock_items for select to authenticated using (public.is_manager());
create policy stock_items_insert on public.stock_items for insert to authenticated with check (public.is_manager());
create policy stock_items_update on public.stock_items for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated using (public.is_manager());

-- ---------------------------------------------------------------- vue « stock actuel »
create or replace view public.v_stock with (security_invoker = on) as
select
  i.id, i.name, i.unit, i.category, i.min_qty, i.is_active,
  coalesce(sum(m.qty), 0)::numeric(12,3)                                  as qty_on_hand,
  coalesce(sum(m.qty)  filter (where m.kind = 'entree'), 0)::numeric(12,3) as total_in,
  coalesce(-sum(m.qty) filter (where m.kind = 'sortie'), 0)::numeric(12,3) as total_out,
  max(m.moved_at) filter (where m.kind = 'entree')                        as last_in_at,
  max(m.moved_at) filter (where m.kind = 'sortie')                        as last_out_at,
  (array_agg(m.unit_cost order by m.moved_at desc)
     filter (where m.kind = 'entree' and m.unit_cost is not null))[1]     as last_unit_cost,
  (i.min_qty > 0 and coalesce(sum(m.qty), 0) <= i.min_qty)                as is_low
from public.stock_items i
left join public.stock_movements m on m.item_id = i.id
group by i.id;
grant select on public.v_stock to authenticated;

-- ---------------------------------------------------------------- entrée / sortie
create or replace function public.staff_stock_move(
  p_item      uuid,
  p_kind      text,            -- 'entree' | 'sortie'
  p_qty       numeric,         -- toujours positif
  p_unit_cost numeric default null,
  p_party     text    default null,
  p_note      text    default null
) returns numeric              -- nouveau stock de l'article
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stock numeric; v_signed numeric;
begin
  if not public.is_manager() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if p_kind not in ('entree', 'sortie') then raise exception 'Type de mouvement invalide'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantité invalide'; end if;

  perform 1 from public.stock_items where id = p_item and is_active for update;   -- verrou anti double sortie
  if not found then raise exception 'Article introuvable'; end if;

  select coalesce(sum(qty), 0) into v_stock from public.stock_movements where item_id = p_item;
  v_signed := case when p_kind = 'entree' then p_qty else -p_qty end;
  if p_kind = 'sortie' and v_stock + v_signed < 0 then
    raise exception 'Stock insuffisant : % disponible', v_stock;
  end if;

  insert into public.stock_movements (item_id, kind, qty, unit_cost, party, note, by_name)
  values (p_item, p_kind, v_signed,
          case when p_kind = 'entree' then p_unit_cost end,
          nullif(btrim(p_party), ''), nullif(btrim(p_note), ''),
          (select full_name from public.staff where id = auth.uid()));
  return v_stock + v_signed;
end $$;

-- ---------------------------------------------------------------- comptage physique
create or replace function public.staff_stock_count(p_item uuid, p_counted numeric, p_note text default null)
returns numeric
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stock numeric; v_delta numeric;
begin
  if not public.is_manager() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if p_counted is null or p_counted < 0 then raise exception 'Quantité comptée invalide'; end if;

  perform 1 from public.stock_items where id = p_item and is_active for update;
  if not found then raise exception 'Article introuvable'; end if;

  select coalesce(sum(qty), 0) into v_stock from public.stock_movements where item_id = p_item;
  v_delta := p_counted - v_stock;
  if v_delta <> 0 then
    insert into public.stock_movements (item_id, kind, qty, note, by_name)
    values (p_item, 'ajustement', v_delta, coalesce(nullif(btrim(p_note), ''), 'Inventaire physique'),
            (select full_name from public.staff where id = auth.uid()));
  end if;
  return p_counted;
end $$;

revoke all on function public.staff_stock_move(uuid, text, numeric, numeric, text, text) from public, anon;
revoke all on function public.staff_stock_count(uuid, numeric, text) from public, anon;
grant execute on function public.staff_stock_move(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.staff_stock_count(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------- articles de départ (stock à 0)
insert into public.stock_items (name, unit, category, min_qty) values
  ('Café en grains', 'kg', 'Boissons', 2),   ('Lait', 'L', 'Boissons', 10),
  ('Sucre', 'kg', 'Épicerie', 5),            ('Thé', 'paquet', 'Boissons', 5),
  ('Farine', 'kg', 'Épicerie', 10),          ('Huile', 'L', 'Épicerie', 5),
  ('Poulet', 'kg', 'Viandes', 5),            ('Viande hachée', 'kg', 'Viandes', 5),
  ('Pain', 'unité', 'Boulangerie', 30),      ('Œufs', 'plaquette', 'Épicerie', 3),
  ('Pommes de terre', 'kg', 'Légumes', 10),  ('Gobelets et emballages', 'paquet', 'Emballages', 5)
on conflict do nothing;
