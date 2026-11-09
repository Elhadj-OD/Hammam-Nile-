-- ============================================================================
-- CAFÉ DUGOUT — 11. Vider les commandes et l'historique de test avant l'ouverture
-- ⚠ DÉFINITIF : supprime toutes les commandes, leurs plats, les paiements et les bons imprimés.
-- À lancer UNE SEULE FOIS, avant le premier vrai service.
--
-- Ce qui est conservé : comptes équipe, menu, catégories, tables, photos, réglages.
-- ============================================================================

-- Les plats, paiements et bons imprimés partent avec leurs commandes (suppression en cascade).
delete from public.orders;

-- La numérotation repart à CD-0001.
do $$
declare seq text;
begin
  seq := pg_get_serial_sequence('public.orders', 'order_no');
  if seq is not null then
    execute format('alter sequence %s restart with 1', seq);
  end if;
end $$;

-- Facultatif : décommentez les lignes voulues.
-- delete from public.expenses;          -- dépenses de test
-- delete from public.stock_movements;   -- mouvements de stock de test (magasin ET cuisine remis à zéro)

-- Contrôle : tout doit afficher 0
select (select count(*) from public.orders)      as commandes,
       (select count(*) from public.order_items) as plats,
       (select count(*) from public.payments)    as paiements,
       (select count(*) from public.order_tickets) as bons;
