-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — LISTE COMPLÈTE DES EMPLOYÉES ET LAVEURS (v2, corrigée)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
--
-- ⚠️ CE SCRIPT REMPLACE toutes les versions précédentes de ce fichier.
-- Il repart d'une liste propre : il efface complètement le contenu actuel
-- des tables "employees" et "laveurs", puis les reconstruit avec les bons
-- rôles (une inversion avait eu lieu côté Hammam Homme). Aucun impact sur
-- l'historique des ventes/commissions déjà enregistrées (les noms y sont
-- simplement recopiés en texte, pas liés à ces tables).
--
-- ⚠️ À exécuter APRÈS supabase_add_employees.sql (version mise à jour avec
-- la colonne "gender") et supabase_add_cashiername_laveur_commissions.sql.
-- ==============================================================================

-- Repart d'une base propre pour ces deux tables.
DELETE FROM public.employees;
DELETE FROM public.laveurs;

-- ------------------------------------------------------------------------------
-- HAMMAM — LAVEURS/LAVEUSES (réalisent le soin ; table "laveurs")
-- ------------------------------------------------------------------------------

-- Hammam Femme — laveuses
INSERT INTO public.laveurs (name, gender) VALUES
  ('Aïcha', 'femme'),
  ('Aravat', 'femme'),
  ('Kehle', 'femme'),
  ('Yaye', 'femme'),
  ('Mariam Fall', 'femme'),
  ('Dedah', 'femme'),
  ('Zeinabou', 'femme')
ON CONFLICT (name) DO NOTHING;

-- Hammam Homme — laveurs
INSERT INTO public.laveurs (name, gender) VALUES
  ('Med 1', 'homme'),
  ('Med 2', 'homme'),
  ('Hamoude', 'homme')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- HAMMAM — CAISSIÈRES/CAISSIERS (tiennent la caisse ; table "employees",
-- catégorie "hammam_bains", séparées par genre comme les laveurs)
-- ------------------------------------------------------------------------------

-- Hammam Femme — caissières
INSERT INTO public.employees (name, category, gender) VALUES
  ('Khadi', 'hammam_bains', 'femme'),
  ('Oumou', 'hammam_bains', 'femme'),
  ('Houdou', 'hammam_bains', 'femme'),
  ('Kadia', 'hammam_bains', 'femme'),
  ('Fatima', 'hammam_bains', 'femme'),
  ('Salimata', 'hammam_bains', 'femme'),
  ('Biya', 'hammam_bains', 'femme'),
  ('Sora', 'hammam_bains', 'femme'),
  ('Coumbis', 'hammam_bains', 'femme')
ON CONFLICT (name, category) DO NOTHING;

-- Hammam Homme — caissiers
INSERT INTO public.employees (name, category, gender) VALUES
  ('Elhadj', 'hammam_bains', 'homme'),
  ('Thierno', 'hammam_bains', 'homme')
ON CONFLICT (name, category) DO NOTHING;

-- ------------------------------------------------------------------------------
-- COIFFURE & SALON — employées (table "employees", pas de genre)
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (name, category) VALUES
  ('Dior', 'coiffure_salon'),
  ('Ramata', 'coiffure_salon'),
  ('Niass', 'coiffure_salon'),
  ('Binta', 'coiffure_salon'),
  ('Fama', 'coiffure_salon'),
  ('Sala', 'coiffure_salon'),
  ('Ramla', 'coiffure_salon'),
  ('Barakatou', 'coiffure_salon'),
  ('Mariem', 'coiffure_salon'),
  ('Nombe', 'coiffure_salon')
ON CONFLICT (name, category) DO NOTHING;

-- ------------------------------------------------------------------------------
-- ÉPILATION TRADITIONNELLE — employées
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (name, category) VALUES
  ('Mah', 'epilation_traditionnelle'),
  ('Selem', 'epilation_traditionnelle'),
  ('Marietou', 'epilation_traditionnelle'),
  ('Fatis', 'epilation_traditionnelle'),
  ('Mk', 'epilation_traditionnelle'),
  ('Halime', 'epilation_traditionnelle'),
  ('Toutou', 'epilation_traditionnelle'),
  ('Mpique', 'epilation_traditionnelle'),
  ('Weitahe', 'epilation_traditionnelle'),
  ('Negde', 'epilation_traditionnelle'),
  ('Minetou', 'epilation_traditionnelle')
ON CONFLICT (name, category) DO NOTHING;

-- ------------------------------------------------------------------------------
-- ESTHÉTIQUE — employées
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (name, category) VALUES
  ('Martha', 'spa_massage'),
  ('Alou', 'spa_massage'),
  ('Oumou', 'spa_massage'),
  ('Kake', 'spa_massage'),
  ('Leyla', 'spa_massage'),
  ('Fatimatou', 'spa_massage'),
  ('Oumeyma', 'spa_massage'),
  ('Mahjouba', 'spa_massage'),
  ('Zeinabou', 'spa_massage'),
  ('Sirine', 'spa_massage'),
  ('Safia', 'spa_massage'),
  ('Clariss', 'spa_massage'),
  ('Khadi', 'spa_massage')
ON CONFLICT (name, category) DO NOTHING;
