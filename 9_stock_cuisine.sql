-- ============================================================================
-- CAFÉ DUGOUT — 9. Stock MAGASIN (grand stock) et stock CUISINE séparés
-- À exécuter une fois dans le SQL Editor (après 1 à 8).
--
--   Magasin  : le grand stock. Entrées (achats), envois vers la cuisine, comptage.   Admin + gérant.
--   Cuisine  : le petit stock de travail. Il se remplit UNIQUEMENT par les envois du magasin
--              et diminue quand la cuisine déclare « Utilisé / Perte / Casse ».        Admin + gérant + cuisine.
--
-- Un envoi Magasin -> Cuisine crée deux lignes liées (−magasin / +cuisine) dans la même transaction.
-- La cuisine ne voit jamais le stock du magasin ni les prix d'achat.
-- ============================================================================

alter table public.stock_movements add column if not exists location    text not null default 'magasin';
alter table public.stock_movements add column if not exists transfer_id uuid;       -- relie les 2 lignes d'un envoi
alter table public.stock_movements drop constraint if exists stock_movements_location_ck;
alter table public.stock_movements add  constraint stock_movements_location_ck check (location in ('magasin', 'cuisine'));
create index if not exists stock_movements_loc_idx on public.stock_movements (item_id, location, moved_at desc);

alter table public.stock_items add column if not exists min_cuisine numeric(12,3) not null default 0 check (min_cuisine >= 0);  -- seuil « stock bas » en cuisine

-- ---------------------------------------------------------------- droits de lecture
drop policy if exists stock_items_read on public.stock_items;
create policy stock_items_read on public.stock_items for select to authenticated
  using (public.has_role(array['admin', 'gerant', 'cuisine']::public.staff_role[]));

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated
  using (public.is_manager() or (location = 'cuisine' and public.has_role(array['cuisine']::public.staff_role[])));

-- ---------------------------------------------------------------- vue : les deux stocks côte à côte
drop view if exists public.v_stock;
create view public.v_stock with (security_invoker = on) as
select
  i.id, i.name, i.unit, i.category, i.min_qty, i.min_cuisine, i.is_active,
  -- MAGASIN
  coalesce(sum(m.qty)  filter (where m.location = 'magasin'), 0)::numeric(12,3)                           as qty_on_hand,
  coalesce(sum(m.qty)  filter (where m.location = 'magasin' and m.kind = 'entree'), 0)::numeric(12,3)     as total_in,
  coalesce(-sum(m.qty) filter (where m.location = 'magasin' and m.kind = 'sortie'), 0)::numeric(12,3)     as total_out,
  max(m.moved_at) filter (where m.location = 'magasin' and m.kind = 'entree')                             as last_in_at,
  max(m.moved_at) filter (where m.location = 'magasin' and m.kind = 'sortie')                             as last_out_at,
  (array_agg(m.unit_cost order by m.moved_at desc)
     filter (where m.location = 'magasin' and m.kind = 'entree' and m.unit_cost is not null))[1]          as last_unit_cost,
  (i.min_qty > 0 and coalesce(sum(m.qty) filter (where m.location = 'magasin'), 0) <= i.min_qty)         as is_low,
  -- CUISINE
  coalesce(sum(m.qty)  filter (where m.location = 'cuisine'), 0)::numeric(12,3)                           as qty_cuisine,
  coalesce(sum(m.qty)  filter (where m.location = 'cuisine' and m.kind = 'entree'), 0)::numeric(12,3)     as cuisine_in,
  coalesce(-sum(m.qty) filter (where m.location = 'cuisine' and m.kind = 'sortie'), 0)::numeric(12,3)     as cuisine_used,
  max(m.moved_at) filter (where m.location = 'cuisine' and m.kind = 'entree')                             as last_cuisine_in_at,
  (i.min_cuisine > 0 and coalesce(sum(m.qty) filter (where m.location = 'cuisine'), 0) <= i.min_cuisine) as is_low_cuisine
from public.stock_items i
left join public.stock_movements m on m.item_id = i.id
group by i.id;
grant select on public.v_stock to authenticated;

-- ---------------------------------------------------------------- Magasin : entrée (achat) / envoi vers la cuisine
create or replace function public.staff_stock_move(
  p_item uuid, p_kind text, p_qty numeric, p_unit_cost numeric default null,
  p_party text default null, p_note text default null
) returns numeric                              -- nouveau stock MAGASIN de l'article
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stock numeric; v_by text; v_tid uuid;
begin
  if not public.is_manager() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if p_kind not in ('entree', 'sortie') then raise exception 'Type de mouvement invalide'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantité invalide'; end if;

  perform 1 from public.stock_items where id = p_item and is_active for update;
  if not found then raise exception 'Article introuvable'; end if;

  select coalesce(sum(qty), 0) into v_stock from public.stock_movements where item_id = p_item and location = 'magasin';
  select full_name into v_by from public.staff where id = auth.uid();

  if p_kind = 'entree' then
    insert into public.stock_movements (item_id, location, kind, qty, unit_cost, party, note, by_name)
    values (p_item, 'magasin', 'entree', p_qty, p_unit_cost, nullif(btrim(p_party), ''), nullif(btrim(p_note), ''), v_by);
    return v_stock + p_qty;
  end if;

  if v_stock - p_qty < 0 then raise exception 'Stock magasin insuffisant : % disponible', v_stock; end if;
  v_tid := gen_random_uuid();
  insert into public.stock_movements (item_id, location, kind, qty, party, note, by_name, transfer_id)
  values (p_item, 'magasin', 'sortie', -p_qty, 'Cuisine', nullif(btrim(p_note), ''), v_by, v_tid),
         (p_item, 'cuisine', 'entree',  p_qty, 'Magasin', nullif(btrim(p_note), ''), v_by, v_tid);
  return v_stock - p_qty;
end $$;

-- ---------------------------------------------------------------- Cuisine : utilisé / perte / casse
create or replace function public.staff_kitchen_use(p_item uuid, p_qty numeric, p_reason text default 'Utilisé', p_note text default null)
returns numeric                                -- nouveau stock CUISINE de l'article
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stock numeric; v_by text;
begin
  if not public.has_role(array['admin', 'gerant', 'cuisine']::public.staff_role[]) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  if p_qty is null or p_qty <= 0 then raise exception 'Quantité invalide'; end if;

  perform 1 from public.stock_items where id = p_item and is_active for update;
  if not found then raise exception 'Article introuvable'; end if;

  select coalesce(sum(qty), 0) into v_stock from public.stock_movements where item_id = p_item and location = 'cuisine';
  if v_stock - p_qty < 0 then raise exception 'Stock cuisine insuffisant : % disponible', v_stock; end if;

  select full_name into v_by from public.staff where id = auth.uid();
  insert into public.stock_movements (item_id, location, kind, qty, party, note, by_name)
  values (p_item, 'cuisine', 'sortie', -p_qty, left(coalesce(nullif(btrim(p_reason), ''), 'Utilisé'), 80), nullif(btrim(p_note), ''), v_by);
  return v_stock - p_qty;
end $$;

-- ---------------------------------------------------------------- Comptage physique (magasin ou cuisine)
drop function if exists public.staff_stock_count(uuid, numeric, text);
create or replace function public.staff_stock_count(p_item uuid, p_counted numeric, p_note text default null, p_location text default 'magasin')
returns numeric
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_stock numeric; v_delta numeric;
begin
  if p_location not in ('magasin', 'cuisine') then raise exception 'Lieu invalide'; end if;
  if p_location = 'magasin' and not public.is_manager() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if p_location = 'cuisine' and not public.has_role(array['admin', 'gerant', 'cuisine']::public.staff_role[]) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  if p_counted is null or p_counted < 0 then raise exception 'Quantité comptée invalide'; end if;

  perform 1 from public.stock_items where id = p_item and is_active for update;
  if not found then raise exception 'Article introuvable'; end if;

  select coalesce(sum(qty), 0) into v_stock from public.stock_movements where item_id = p_item and location = p_location;
  v_delta := p_counted - v_stock;
  if v_delta <> 0 then
    insert into public.stock_movements (item_id, location, kind, qty, note, by_name)
    values (p_item, p_location, 'ajustement', v_delta, coalesce(nullif(btrim(p_note), ''), 'Inventaire physique'),
            (select full_name from public.staff where id = auth.uid()));
  end if;
  return p_counted;
end $$;

revoke all on function public.staff_stock_move(uuid, text, numeric, numeric, text, text) from public, anon;
revoke all on function public.staff_kitchen_use(uuid, numeric, text, text) from public, anon;
revoke all on function public.staff_stock_count(uuid, numeric, text, text) from public, anon;
grant execute on function public.staff_stock_move(uuid, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.staff_kitchen_use(uuid, numeric, text, text) to authenticated;
grant execute on function public.staff_stock_count(uuid, numeric, text, text) to authenticated;

-- Vérification : liste les articles avec leurs deux stocks (tout à 0 au départ).
select name, unit, qty_on_hand as magasin, qty_cuisine as cuisine from public.v_stock order by name limit 5;
