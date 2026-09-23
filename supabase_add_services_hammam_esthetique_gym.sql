-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — AJOUT DES PRESTATIONS (Hammam & Soins, Épilation
-- Traditionnelle Helwa, Fitness Gym, Soins & Beauté / Esthétique)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor (pas Logs), puis "Run".
-- Sans danger, peut être relancé plusieurs fois : ON CONFLICT (id) DO NOTHING,
-- aucune donnée existante n'est jamais écrasée.
--
-- ⚠️ Les prestations "Helwa" (épilation traditionnelle) sont ajoutées avec
-- price = 0 : le menu photographié affichait "XXX MRU" (prix non
-- communiqués). À corriger depuis Produits > Modifier une fois les vrais
-- tarifs connus.
-- ==============================================================================

INSERT INTO public.products (id, name, category, price, qty, "minQty", emoji, description)
VALUES
  -- Hammam & Soins
  (188, 'Hammam simple', 'hammam_bains', 400, 999, 0, '♨️', 'Accès hammam'),
  (189, 'Gommage au café', 'hammam_bains', 200, 999, 0, '☕', 'Peau douce et éclatante'),
  (190, 'Sègle (masque)', 'hammam_bains', 100, 999, 0, '🧖', 'Soin purifiant'),
  (191, 'Hammam Signature', 'hammam_bains', 700, 999, 0, '♨️', 'Gommage café + masque à l''argile'),
  (192, 'Hammam complet', 'hammam_bains', 800, 999, 0, '♨️', 'Gommage bissap (3 masques : argile, herbes, café)'),
  (193, 'Hammam privé', 'hammam_bains', 1500, 999, 0, '♨️', 'Masque, gommage bissap, masque argile, herbes, café, masque calmante, à boire, mele7fe (voile), un thé et collation'),

  -- Épilation Traditionnelle Helwa (prix à définir — voir avertissement ci-dessus)
  (194, 'Helwa - Sourcils', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (195, 'Helwa - Lèvre supérieure', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (196, 'Helwa - Visage complet', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (197, 'Helwa - Aisselles', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (198, 'Helwa - Bras', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (199, 'Helwa - Demi-jambes', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (200, 'Helwa - Jambes complètes', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (201, 'Helwa - Maillot classique', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (202, 'Helwa - Maillot intégral', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (203, 'Helwa - Dos', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (204, 'Helwa - Ventre', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (205, 'Helwa - Fesses', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (206, 'Helwa - Doigts / Orteils', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Prix à définir'),
  (207, 'Helwa - Combo Visage', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Sourcils + lèvre + visage — prix à définir'),
  (208, 'Helwa - Combo Haut du corps', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Aisselles + bras — prix à définir'),
  (209, 'Helwa - Combo Bas du corps', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Demi-jambes + maillot — prix à définir'),
  (210, 'Helwa - Combo Complet', 'epilation_traditionnelle', 0, 999, 0, '🪡', 'Jambes complètes + maillot + aisselles — prix à définir'),

  -- Fitness Gym
  (211, 'Gym - Accès à la journée', 'fitness_gym', 200, 999, 0, '🏋️', 'Une seule entrée, valable toute la journée'),
  (212, 'Gym - Abonnement Mensuel', 'fitness_gym', 1500, 999, 0, '🏋️', 'Accès salle + cours collectifs + suivi coachs, par mois'),
  (213, 'Gym - Frais d''inscription', 'fitness_gym', 200, 999, 0, '🏋️', 'Une seule fois, création du profil membre'),
  (214, 'Gym - Carte 10 séances', 'fitness_gym', 1800, 999, 0, '🏋️', 'Valable 2 mois (180 MRU/séance)'),
  (215, 'Gym - Abonnement 3 mois', 'fitness_gym', 4000, 999, 0, '🏋️', '1 333 MRU/mois'),
  (216, 'Gym - Abonnement 6 mois', 'fitness_gym', 7500, 999, 0, '🏋️', '1 250 MRU/mois'),
  (217, 'Gym - Abonnement 12 mois', 'fitness_gym', 13000, 999, 0, '🏋️', '1 083 MRU/mois'),

  -- Soins & Beauté — Soins du visage (Esthétique)
  (218, 'Plasma visage complet', 'spa_massage', 12000, 999, 0, '✨', NULL),
  (219, 'Soin Hydrafacial', 'spa_massage', 3500, 999, 0, '✨', NULL),
  (220, 'Soin basique', 'spa_massage', 1500, 999, 0, '✨', NULL),
  (221, 'Soin spécifique', 'spa_massage', 2000, 999, 0, '✨', NULL),
  (222, 'Mousse médicale', 'spa_massage', 6000, 999, 0, '✨', NULL),
  (223, 'Derma pen', 'spa_massage', 3000, 999, 0, '✨', NULL),
  (224, 'Oxygeno', 'spa_massage', 3000, 999, 0, '✨', NULL),

  -- Soins & Beauté — Piercing (Esthétique)
  (225, 'Piercing Chama', 'spa_massage', 1000, 999, 0, '💎', NULL),
  (226, 'Piercing Abdominal', 'spa_massage', 500, 999, 0, '💎', NULL),
  (227, 'Piercing Nez', 'spa_massage', 300, 999, 0, '💎', NULL),
  (228, 'Piercing Sourcil', 'spa_massage', 500, 999, 0, '💎', NULL),
  (229, 'Piercing Bouche', 'spa_massage', 500, 999, 0, '💎', NULL),

  -- Soins & Beauté — Épilation moderne (Esthétique, distincte de la Helwa)
  (230, 'Épilation Visage', 'spa_massage', 400, 999, 0, '🪒', NULL),
  (231, 'Épilation Sourcils (seule)', 'spa_massage', 200, 999, 0, '🪒', NULL),
  (232, 'Épilation Sourcils (avec coloration)', 'spa_massage', 300, 999, 0, '🪒', NULL),
  (233, 'Faux cils (pose)', 'spa_massage', 400, 999, 0, '👁️', NULL),
  (234, 'Épilation Bras', 'spa_massage', 400, 999, 0, '🪒', NULL),
  (235, 'Épilation Jambes complètes', 'spa_massage', 800, 999, 0, '🪒', NULL),
  (236, 'Épilation Demi-jambes', 'spa_massage', 500, 999, 0, '🪒', NULL),
  (237, 'Épilation Aisselles', 'spa_massage', 200, 999, 0, '🪒', NULL),
  (238, 'Épilation Moustache', 'spa_massage', 100, 999, 0, '🪒', NULL),
  (239, 'Épilation Maillot', 'spa_massage', 1500, 999, 0, '🪒', NULL),
  (240, 'Corps complet sans maillot', 'spa_massage', 25000, 999, 0, '🪒', NULL),
  (241, 'Corps complet avec maillot', 'spa_massage', 35000, 999, 0, '🪒', NULL),

  -- Soins & Beauté — Massage (Esthétique)
  (242, 'Massage 30 minutes', 'spa_massage', 800, 999, 0, '💆', NULL),
  (243, 'Massage 45 minutes', 'spa_massage', 1300, 999, 0, '💆', NULL),
  (244, 'Massage 1 heure', 'spa_massage', 1500, 999, 0, '💆', NULL),
  (245, 'Supplément Pierre chaude', 'spa_massage', 200, 999, 0, '🪨', 'En complément d''un massage'),

  -- Soins & Beauté — Maquillage (Esthétique)
  (246, 'Maquillage Simple', 'spa_massage', 600, 999, 0, '💄', NULL),
  (247, 'Maquillage avec faux cils', 'spa_massage', 800, 999, 0, '💄', NULL),
  (248, 'Maquillage Mariage', 'spa_massage', 1000, 999, 0, '👰', NULL),

  -- Soins & Beauté — Manucure & Pédicure (Esthétique)
  (249, 'Manucure', 'spa_massage', 600, 999, 0, '💅', NULL),
  (250, 'Pédicure simple', 'spa_massage', 600, 999, 0, '💅', NULL),
  (251, 'Paraffine extra', 'spa_massage', 200, 999, 0, '💅', NULL),
  (252, 'Épilation orteil', 'spa_massage', 100, 999, 0, '💅', NULL),
  (253, 'Pose ongle simple', 'spa_massage', 200, 999, 0, '💅', NULL),
  (254, 'French manicure', 'spa_massage', 300, 999, 0, '💅', NULL),
  (255, 'Vernis permanent', 'spa_massage', 500, 999, 0, '💅', NULL),
  (256, 'French manicure permanent', 'spa_massage', 700, 999, 0, '💅', NULL),
  (257, 'Pose gel', 'spa_massage', 1500, 999, 0, '💅', NULL)
ON CONFLICT (id) DO NOTHING;
