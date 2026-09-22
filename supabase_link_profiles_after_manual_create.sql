-- ==============================================================================
-- À exécuter APRÈS avoir créé les 6 comptes manuellement dans
-- Supabase Dashboard > Authentication > Users (voir instructions).
-- Relie chaque compte Auth (par e-mail) à son profil applicatif.
-- Sans danger, peut être relancé (ON CONFLICT ignore les doublons).
-- ==============================================================================

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, phone, must_change_password)
SELECT id, 'sophia', 'Sophia', 'gerant', 'femme', NULL, 'SO', '+222 36 98 76 54', true
FROM auth.users WHERE email = 'sophia@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, phone, must_change_password)
SELECT id, 'elhadj', 'Elhadj', 'caissier', 'homme', 'boutique_homme', 'EH', '+222 46 12 34 56', true
FROM auth.users WHERE email = 'elhadj@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, must_change_password)
SELECT id, 'femme', 'Caissière Boutique Femme', 'caissier', 'femme', 'boutique_femme', 'BF', true
FROM auth.users WHERE email = 'femme@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, must_change_password)
SELECT id, 'hammam', 'Caissière Hammam & Bains', 'caissier', 'femme', 'hammam_bains', 'HB', true
FROM auth.users WHERE email = 'hammam@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, must_change_password)
SELECT id, 'spa', 'Caissière Spa & Massage', 'caissier', 'femme', 'spa_massage', 'SM', true
FROM auth.users WHERE email = 'spa@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, name, role, gender, department, avatar, must_change_password)
SELECT id, 'coiffure', 'Caissière Coiffure & Salon', 'caissier', 'femme', 'coiffure_salon', 'CS', true
FROM auth.users WHERE email = 'coiffure@hammamnile.local'
ON CONFLICT (id) DO NOTHING;

-- Vérification : doit afficher 6 lignes
SELECT username, name, role FROM public.profiles ORDER BY username;
