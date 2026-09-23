-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — TABLE PROFILES (authentification Supabase Auth)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor (pas Logs), puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Remplace l'ancienne liste d'utilisateurs stockée en clair côté client
-- (src/data/initialData.ts, mots de passe en clair dans le bundle JS
-- public). Chaque compte devient un vrai utilisateur Supabase Auth
-- (mot de passe hashé côté serveur, jamais transmis ni stocké en clair) ;
-- cette table ne porte que les métadonnées applicatives (nom, rôle,
-- département...), jamais de secret.
--
-- ⚠️ AVANT DE CONTINUER, dans Supabase Dashboard :
--   Authentication > Providers > Email > décochez "Confirm email".
--   Les comptes utilisent des adresses internes (ex: sophia@hammamnile.local)
--   qui ne peuvent recevoir aucun e-mail réel — sans cette étape, la
--   création de compte échouera pour les comptes non créés via l'API admin.
--   (Les comptes créés par api/admin-users.ts ou le script de migration
--   passent déjà "email_confirm: true" et n'ont pas besoin de ce réglage,
--   mais le désactiver reste la configuration correcte pour ce projet.)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'caissier' CHECK (role IN ('caissier', 'gerant')),
  gender TEXT CHECK (gender IN ('femme', 'homme')),
  department TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  avatar TEXT,
  phone TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la table existait déjà (premier passage de ce fichier avant l'ajout
-- des e-mails réels), ajoute la colonne sans rien casser.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux comptes authentifiés (liste d'équipe, écran
-- "switch user"). AUCUNE policy INSERT/UPDATE/DELETE cliente : toute
-- écriture passe par api/admin-users.ts (clé service_role côté serveur),
-- qui vérifie que l'appelant est 'gerant' avant de modifier un autre
-- compte que le sien.
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Temps réel : pour que la liste d'équipe se mette à jour sans
-- rechargement de page quand un profil change sur un autre appareil.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
