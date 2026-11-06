-- ============================================================================
--  CAFÉ DUGOUT — DONNÉES DE DÉPART (partie 2/2)
--  À coller dans Supabase > SQL Editor APRÈS avoir exécuté 1_schema.sql
--  Idempotent : relançable sans doublon. Les identifiants sont FIXES :
--  c'est ce qui permet aux QR codes imprimés de rester valables.
-- ============================================================================

-- Catégories
insert into public.categories (slug, label, sort_order) values
  ('petit-dejeuner', 'Petit déjeuner', 1),
  ('cascroute', 'Cascroute', 2),
  ('snack', 'Snack', 3),
  ('sucre', 'Salle sucrée', 4),
  ('boissons', 'Boissons', 5)
on conflict (slug) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Tables du restaurant (code + jeton du QR code)
insert into public.resto_tables (id, code, label, seats, qr_token) values
  ('c59aa7cd-81a3-56a8-8029-e1e61533d4f4', 'T01', 'Table 1', 4, '36e4e230-0f6f-5459-951c-fd5d9653bfa1'),
  ('ace4361a-ac43-5230-b5a8-3c99ca85f530', 'T02', 'Table 2', 4, '86c5cd34-5fd4-5982-894b-c4b244357864'),
  ('1c5a9444-c86a-5a04-856c-61430fe4c24c', 'T03', 'Table 3', 4, '3b3f4644-b6a3-5a67-980c-bbfd6a23fb29'),
  ('bda1232c-3175-5d78-8638-d821597c8b9a', 'T04', 'Table 4', 4, 'ad75f82d-079f-52e4-95e2-888198320c91'),
  ('55ccb6d7-1b10-54e6-b7ea-0291e4cb61d3', 'T05', 'Table 5', 4, '165132f8-8628-5d6a-bc7c-2b8481ddbd41'),
  ('71471961-80ed-553f-b5f3-59ef2582021d', 'T06', 'Table 6', 4, 'd804773c-1949-557b-85a2-14545a49a7c1'),
  ('47a40427-7d14-535d-8d87-c7f8e4b2bbc7', 'T07', 'Table 7', 4, '4fddbb27-5c26-52ab-9f8b-e71d7ceed931'),
  ('d1c2d5fb-fa57-5068-a23c-4f65a91dcc58', 'T08', 'Table 8', 4, '096feb79-167b-5eba-91fc-b19b532007d3'),
  ('7b978d95-7f24-5d39-994a-cfb28366257c', 'T09', 'Table 9', 4, '5a610b77-32b7-5e21-99d1-6461ab733183'),
  ('c6644b74-0eae-5be0-bd3e-5c3989cde85c', 'T10', 'Table 10', 4, 'bd02f018-4d82-5a94-a91e-15b92b699d52'),
  ('fcd8b373-26ed-5bf4-bcd0-b6456fc81de8', 'T11', 'Table 11', 4, '38a66c7e-8f92-5415-a7d6-25db3aa1e0dd'),
  ('8374f486-6046-55af-8cf2-704d16b052a7', 'T12', 'Table 12', 4, 'd91bd517-8e47-5ba2-b22d-710dde387db5'),
  ('d4151ec8-e6f8-522c-84c8-61a9bc68994d', 'T13', 'Table 13', 4, '5f04bf3c-05bc-5294-9d3f-1fa9b0466946'),
  ('fd8b578f-1352-5eb8-b032-61e418d39f22', 'T14', 'Table 14', 4, 'f4d831ff-8a3d-5c6a-b822-5e126e4ecbaa'),
  ('c23d78c0-56f7-55e8-bb3d-d464f7cde82f', 'T15', 'Table 15', 4, 'cf613e43-74f0-5d82-a563-db9b4811ea25'),
  ('9f7cba87-57ff-5e6e-851d-5d25f0334cb3', 'T16', 'Table 16', 4, '62129dd2-6d1e-5c91-ad40-866917624ce5'),
  ('979a6891-30b1-5866-98ec-ecd34317cecc', 'T17', 'Table 17', 4, '5561da6a-09d6-5e8a-86e7-f3757c1d3f18'),
  ('ef7a0ac4-92f5-5b66-9307-11c6f9dba42e', 'T18', 'Table 18', 4, 'feaa27b1-40ca-58fc-9010-2215f54646b3'),
  ('82ba1cd1-46d3-54f3-8e83-eea85d590f94', 'T19', 'Table 19', 4, '8a5441bd-ea41-5be0-ad01-ab21671cfc52'),
  ('1be080f5-c569-529a-8034-07178b46d15b', 'T20', 'Table 20', 4, '8cb01948-9713-5850-b209-5eabf7e21428'),
  ('b5a696e3-4be0-555a-aa43-2be86a4286f1', 'EMP', 'À emporter', 1, '0847e496-abe0-5bb4-a074-f707f706f469')
on conflict (code) do update set label = excluded.label, seats = excluded.seats;

-- Produits du menu
insert into public.menu_items (id, name, category_slug, price, description, sort_order) values
  ('590272b6-6fcd-5b1b-820a-3e63bc79912f', 'Petit déj Dugout', 'petit-dejeuner', 120, 'Omelette, pain chaud, fromage et café au choix', 0),
  ('f54f934f-286e-5c91-998b-f9d7eee2b113', 'Omelette & pain', 'petit-dejeuner', 70, 'Deux œufs, tomate et pain frais', 1),
  ('14e2bea5-67dd-5380-b640-bd363c89a761', 'Foul & pain', 'petit-dejeuner', 50, 'Fèves mijotées, huile d’olive et pain chaud', 2),
  ('54101eb3-819f-596b-97bf-6f947bcbbf62', 'Cascroute poulet', 'cascroute', 90, 'Poulet grillé, crudités et sauce maison', 3),
  ('a138cae1-c355-5e71-8eb2-27deb333241a', 'Cascroute viande', 'cascroute', 100, 'Viande hachée, oignons et frites dans le pain', 4),
  ('76ac2552-1fa4-56ba-82d4-bda374366cb6', 'Cascroute thon', 'cascroute', 80, 'Thon, olives, œuf et salade', 5),
  ('dfacb13b-8f9c-5c90-ae1a-c087337baee3', 'Burger Dugout', 'snack', 150, 'Steak, fromage fondu, salade et sauce maison', 6),
  ('3e6cee96-0c5e-5b17-a005-f02119fb01b1', 'Chawarma poulet', 'snack', 120, 'Poulet mariné, crudités et sauce à l’ail', 7),
  ('78247355-5fcb-5ff4-9907-146296b38870', 'Frites maison', 'snack', 50, 'Pommes de terre fraîches, bien croustillantes', 8),
  ('ac4e5551-945b-5270-b8d2-e1e7a526ffb6', 'Gâteau du jour', 'sucre', 60, 'Part de gâteau préparée chaque matin', 9),
  ('1a9ea3ef-08d5-571a-9458-24d686d31329', 'Crêpe chocolat', 'sucre', 70, 'Crêpe tiède nappée de chocolat', 10),
  ('3b29018b-5f60-5041-8d97-7a1e614238df', 'Beignets sucrés', 'sucre', 40, 'Six beignets dorés, sucre glace', 11),
  ('a2b6ad22-ef16-5c9d-a9e9-60a08168e748', 'Café noir', 'boissons', 30, 'Espresso serré', 12),
  ('7a7d4527-77e5-56ed-8bf6-afe24f10f503', 'Café au lait', 'boissons', 40, 'Café onctueux au lait chaud', 13),
  ('955f7571-95c6-526c-a3cc-a7c18fb6515c', 'Thé à la menthe', 'boissons', 25, 'Préparé à la mauritanienne, trois services', 14),
  ('bb2b3fe9-28eb-555c-934f-f51888047006', 'Jus de Bissap', 'boissons', 50, 'Hibiscus glacé, frais et désaltérant', 15),
  ('9e71f3af-3a2c-540b-bcc9-ad650aa3f09b', 'Jus de Bouye', 'boissons', 60, 'Pain de singe onctueux, servi bien frais', 16)
on conflict (id) do update set name = excluded.name, category_slug = excluded.category_slug,
  price = excluded.price, description = excluded.description, sort_order = excluded.sort_order;

-- Nettoyage de l'ancien menu (sans effet sur une base neuve)
delete from public.menu_items where id in ('ac9fa5c9-a260-503a-a630-c7d4480a82d4', '80476ff7-bb5b-59ff-a93e-b4a7aa4f052f', 'cc167324-7e04-5f50-8425-dc60b5ac35ae', '218b1ea3-4737-518b-8e0d-620487ff2580', '9b95be93-1164-5f0f-a769-40b609bc7665')
  and not exists (select 1 from public.order_items oi where oi.menu_item_id = menu_items.id);
delete from public.categories where slug in ('plats','entrees','desserts')
  and not exists (select 1 from public.menu_items mi where mi.category_slug = categories.slug);

-- Réglages du resto (modifiable ensuite depuis le dashboard)
update public.settings
   set brand_name = 'Café DUGOUT',
       brand_ar   = '',
       tagline    = 'Le café des passionnés • Football · Bon Café · Bonne Ambiance',
       currency   = 'MRU'
 where id = 1;

-- Vérification rapide : doit renvoyer 21 tables et 17 produits
select (select count(*) from public.resto_tables) as nb_tables,
       (select count(*) from public.menu_items)  as nb_produits;
