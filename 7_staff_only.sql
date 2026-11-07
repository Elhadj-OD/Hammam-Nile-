-- ============================================================================
-- CAFÉ DUGOUT — 7. Commandes et paiements réservés à l'équipe (pas de QR / pas de commande client)
-- À exécuter une fois dans le SQL Editor (après 1 à 6).
--
--   Prendre une commande ........ serveur, gérant, admin
--   Encaisser (paiement) ........ serveur, gérant, admin      (déjà le cas : staff_record_payment)
--   Annuler / supprimer ......... gérant, admin               (déjà le cas)
--   Cuisine ..................... voit les commandes et passe « Attente » <-> « Prêt » uniquement
--   Clients ..................... consultent le menu, ne peuvent plus créer de commande
-- ============================================================================

-- 1. Plus aucune commande publique : on retire le droit d'exécution (anon + connectés + public).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('client_place_order', 'client_place_order_by_table', 'client_place_order_secure')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
  end loop;
end $$;

-- 2. Prendre une commande : serveur, gérant, admin (plus la cuisine).
create or replace function public.staff_place_order(p_table_code text, p_items jsonb, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.resto_tables;
begin
  if not public.has_role(array['admin', 'gerant', 'serveur']::public.staff_role[]) then
    raise exception 'Non autorisé : seuls les serveurs, le gérant et l''admin prennent les commandes' using errcode = '42501';
  end if;
  select * into t from public.resto_tables where code = upper(p_table_code);
  if t.id is null then
    raise exception 'Table inconnue: %', p_table_code using errcode = '22023';
  end if;
  return public.place_order_core(t.id, p_items, p_note, 'serveur', (select auth.uid()));
end $$;

-- 3. Changer de table : serveur, gérant, admin.
create or replace function public.staff_move_order(p_order uuid, p_table_code text)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_target public.resto_tables; v_busy uuid;
begin
  if not public.has_role(array['admin', 'gerant', 'serveur']::public.staff_role[]) then
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

-- 4. Statut : la cuisine ne peut que « Attente » / « Prêt » ; servi et annulé = serveur, gérant, admin.
create or replace function public.staff_set_status(p_order uuid, p_status public.order_status)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.has_role(array['admin', 'gerant', 'serveur']::public.staff_role[]) then
    null;
  elsif public.has_role(array['cuisine']::public.staff_role[]) and p_status in ('attente', 'pret') then
    null;
  else
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  update public.orders set status = p_status where id = p_order;
  if p_status = 'annule' then
    update public.orders set closed_at = now() where id = p_order and closed_at is null;
  end if;
end $$;

-- Vérification : doit renvoyer 0 ligne (aucune fonction de commande client ne reste ouverte au public).
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_peut_executer
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname like 'client_place_order%'
   and has_function_privilege('anon', p.oid, 'execute');
