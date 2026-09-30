-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — LISTE DES EMPLOYÉES (Coiffure, Esthétique, Hammam)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : à relancer sans problème, les doublons sont ignorés.
--
-- ⚠️ À exécuter APRÈS le script supabase_add_employees.sql (qui crée la
-- table "employees" — s'il n'a pas déjà été exécuté).
--
-- La liste Épilation n'a pas encore été fournie : un bloc sera ajouté dès
-- qu'elle sera communiquée.
-- ==============================================================================

-- Coiffure & Salon
INSERT INTO public.employees (name, category) VALUES
  ('Ndeye', 'coiffure_salon'),
  ('Noumbé', 'coiffure_salon'),
  ('Barakatou', 'coiffure_salon'),
  ('Sala', 'coiffure_salon'),
  ('Dior', 'coiffure_salon'),
  ('Marém', 'coiffure_salon'),
  ('Fama', 'coiffure_salon'),
  ('Ramla', 'coiffure_salon'),
  ('Binta', 'coiffure_salon'),
  ('Ramata', 'coiffure_salon'),
  ('Niasse', 'coiffure_salon')
ON CONFLICT (name, category) DO NOTHING;

-- Esthétique
INSERT INTO public.employees (name, category) VALUES
  ('Syrine', 'spa_massage'),
  ('Fatmetou', 'spa_massage'),
  ('Oumeyma', 'spa_massage'),
  ('Kahe', 'spa_massage'),
  ('Mahjouhe', 'spa_massage'),
  ('Zeinebou', 'spa_massage'),
  ('Leyla', 'spa_massage'),
  ('Alou', 'spa_massage'),
  ('Khady', 'spa_massage'),
  ('Oumou', 'spa_massage'),
  ('Safia', 'spa_massage'),
  ('Clarysse', 'spa_massage'),
  ('Martha', 'spa_massage')
ON CONFLICT (name, category) DO NOTHING;

-- Hammam — Laveuses (femmes), table "laveurs" existante
INSERT INTO public.laveurs (name, gender) VALUES
  ('Yaye', 'femme'),
  ('Mariém F', 'femme'),
  ('Zeinabou', 'femme'),
  ('Dada', 'femme'),
  ('Mariem A', 'femme'),
  ('Mariem K', 'femme'),
  ('Aicha', 'femme'),
  ('Manetou', 'femme'),
  ('Mah', 'femme'),
  ('M Pikeu', 'femme'),
  ('Toutou', 'femme')
ON CONFLICT (name) DO NOTHING;

-- Hammam — Laveurs (hommes), table "laveurs" existante
INSERT INTO public.laveurs (name, gender) VALUES
  ('Elhadj', 'homme'),
  ('Thierno', 'homme')
ON CONFLICT (name) DO NOTHING;
