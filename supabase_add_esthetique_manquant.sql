-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — PRESTATIONS ESTHÉTIQUE MANQUANTES
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger, peut être relancé plusieurs fois : ON CONFLICT (id) DO NOTHING,
-- aucune donnée existante n'est jamais écrasée.
-- ==============================================================================

INSERT INTO public.products (id, name, category, price, qty, "minQty", emoji, description)
VALUES
  (301, 'Épilation Menton', 'spa_massage', 100, 999, 0, '✨', NULL),
  (302, 'Demi Soins', 'spa_massage', 1000, 999, 0, '✨', NULL),
  (303, 'Épilation Selk', 'spa_massage', 300, 999, 0, '✨', NULL),
  (304, 'Coloration Sourcils', 'spa_massage', 250, 999, 0, '✨', NULL),
  (305, 'Épilation Demi Bras', 'spa_massage', 300, 999, 0, '✨', NULL)
ON CONFLICT (id) DO NOTHING;
