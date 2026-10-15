-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — PRIX ALIGNÉS SUR LA GRILLE OFFICIELLE DES TARIFS
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger, peut être relancé plusieurs fois : rien n'est supprimé, et les
-- ajouts sont ignorés s'ils existent déjà (vérifiés par nom + caisse).
--
-- Ce que fait ce script :
--   1) corrige les prix qui ne correspondaient pas à la grille ;
--   2) corrige quelques fautes de frappe dans les noms (Tenture → Teinture,
--      Broching/Bruching → Brushing, Tress → Tresses) ;
--   3) ajoute les prestations de la grille qui manquaient.
-- Hammam & Bains, Henné, Piercing, Massage, Maquillage et Fitness/Gym étaient
-- déjà conformes : ils ne sont pas touchés.
-- ==============================================================================

-- 1) PRIX CORRIGÉS (par identifiant de prestation)
UPDATE public.products AS p
SET price = v.price,
    description = NULL
FROM (VALUES
  -- Épilation Traditionnelle Helwa (étaient à 0 "prix à définir")
  (195, 100),    -- Lèvre supérieure
  (196, 200),    -- Visage complet
  (197, 100),    -- Aisselles
  (198, 200),    -- Bras
  (199, 200),    -- Demi-jambes
  (200, 600),    -- Jambes complètes
  (201, 1500),   -- Maillot classique
  (203, 200),    -- Dos
  (204, 200),    -- Ventre
  (205, 200),    -- Fesses
  -- Esthétique
  (231, 150),    -- Sourcils à la cire, sans teinture (était 200)
  (240, 2500),   -- Corps complet sans maillot (était 25 000)
  (241, 3500),   -- Corps complet avec maillot (était 35 000)
  (249, 300)     -- Manucure (était 600)
) AS v(id, price)
WHERE p.id = v.id;

-- 2) NOMS CORRIGÉS (fautes de frappe, alignés sur la grille)
UPDATE public.products AS p
SET name = v.name
FROM (VALUES
  (258, 'Tresses (300 MRU)'),
  (259, 'Tresses (400 MRU)'),
  (260, 'Tresses (500 MRU)'),
  (261, 'Tresses avec mèches (800 MRU)'),
  (262, 'Tresses avec mèches (1000 MRU)'),
  (263, 'Teinture (200 MRU)'),
  (264, 'Teinture (300 MRU)'),
  (268, 'Brushing (400 MRU)'),
  (269, 'Brushing (500 MRU)'),
  (270, 'Brushing (600 MRU)'),
  (271, 'Brushing (700 MRU)'),
  (272, 'Brushing (800 MRU)'),
  (257, 'Pose gel (1500 MRU)'),
  (304, 'Blondage + coloration sourcils')
) AS v(id, name)
WHERE p.id = v.id;

-- 3) PRESTATIONS AJOUTÉES (celles de la grille qui n'étaient pas en base).
-- Les identifiants sont calculés à la suite des existants, pour ne jamais
-- entrer en conflit avec un produit créé à la main dans l'app.
INSERT INTO public.products (id, name, category, price, qty, "minQty", emoji, description)
SELECT
  (SELECT COALESCE(MAX(id), 0) FROM public.products) + ROW_NUMBER() OVER (ORDER BY v.ord),
  v.name, v.category, v.price, 999, 0, v.emoji, v.description
FROM (VALUES
  (1,  'Helwa - Cuisses',                        'epilation_traditionnelle', 400,  '🪡', NULL::text),
  (2,  'Helwa - Demi-jambes et bras',            'epilation_traditionnelle', 300,  '🪡', NULL),
  (3,  'Helwa - Visage, bras et demi-jambes',    'epilation_traditionnelle', 500,  '🪡', NULL),
  (4,  'Helwa - Jambes complètes, visage et bras', 'epilation_traditionnelle', 900, '🪡', NULL),
  (5,  'Helwa complet sans visage',              'epilation_traditionnelle', 1500, '🪡', NULL),
  (6,  'Helwa complet avec visage',              'epilation_traditionnelle', 1700, '🪡', NULL),
  (7,  'Épilation à la lame (rasoir)',           'spa_massage',              300,  '🪒', NULL),
  (8,  'Blondage sourcils seul',                 'spa_massage',              200,  '✨', NULL),
  (9,  'Dessin sourcils à la teinture',          'spa_massage',              150,  '✨', 'Prestation des spécialistes du dessin de sourcils.'),
  (10, 'Diamant dentaire',                       'spa_massage',              200,  '💎', NULL),
  (11, 'Pose gel (1000 MRU)',                    'spa_massage',              1000, '💅', NULL)
) AS v(ord, name, category, price, emoji, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.name = v.name AND p.category = v.category
);

-- 4) CONTRÔLE : affiche les prestations Épilation, Coiffure et Esthétique
-- telles qu'elles sont maintenant en base, pour comparer avec la grille.
SELECT category AS caisse, name AS prestation, price AS prix
FROM public.products
WHERE category IN ('epilation_traditionnelle', 'coiffure_salon', 'spa_massage')
ORDER BY category, name;
