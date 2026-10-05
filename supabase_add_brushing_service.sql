-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — PRESTATION BRUSHING
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger, peut être relancé plusieurs fois : ON CONFLICT (id) DO NOTHING,
-- aucune donnée existante n'est jamais écrasée.
--
-- Prix laissé à 0 ("Prix à définir") : c'est la caissière qui tape le
-- montant directement sur l'écran "Nouveau Service", à chaque passage.
-- ==============================================================================

INSERT INTO public.products (id, name, category, price, qty, "minQty", emoji, description)
VALUES
  (300, 'Brushing', 'brushing', 0, 999, 0, '💁', 'Prix à définir')
ON CONFLICT (id) DO NOTHING;
