-- ============================================================================
-- CAFÉ DUGOUT — 10. Actualisation toutes les 2 secondes, sans surcharger la base
-- À exécuter une fois dans le SQL Editor (après 1 à 9).
--
-- Chaque écran de l'équipe demande toutes les 2 s « quelque chose a-t-il changé ? ».
-- La réponse est une courte empreinte (32 caractères). Les commandes ne sont rechargées
-- QUE lorsque l'empreinte change : nouvelle commande, changement de statut, paiement, ajout de plat…
-- ============================================================================
create or replace function public.orders_signature()
returns text
language sql stable set search_path = public, pg_temp as $$
  with o as (
    select id, status, closed_at, table_id
      from public.orders
     where closed_at is null
        or opened_at > now() - interval '48 hours'
        or closed_at > now() - interval '48 hours'
  )
  select md5(
       coalesce((select string_agg(id::text || status::text || coalesce(closed_at::text, '') || coalesce(table_id::text, ''), ',' order by id) from o), '')
    || '|' || coalesce((select count(*)::text || ':' || coalesce(sum(qty), 0)::text from public.order_items where order_id in (select id from o)), '')
    || '|' || coalesce((select count(*)::text || ':' || coalesce(sum(amount), 0)::text from public.payments where order_id in (select id from o)), '')
  )
$$;

revoke all on function public.orders_signature() from public, anon;
grant execute on function public.orders_signature() to authenticated;

-- Vérification : doit renvoyer une chaîne de 32 caractères
select public.orders_signature() as empreinte;
