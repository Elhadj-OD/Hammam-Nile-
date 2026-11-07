-- ============================================================================
--  MIGRATION 3 — Le client choisit sa table (en plus du QR code)
--  À coller dans Supabase > SQL Editor si tu as déjà exécuté 1_schema.sql
--  avant cette mise à jour. Idempotent : peut être relancé sans risque.
-- ============================================================================

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

-- Vérification : doit renvoyer 2
select count(*) as fonctions_installees
  from pg_proc
 where proname in ('client_place_order_by_table', 'client_open_order_by_table');
