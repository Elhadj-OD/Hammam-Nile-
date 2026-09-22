-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — TABLE PRÉSENCE (qui est connecté, contrôle des heures)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor (pas Logs), puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Ne stocke JAMAIS de mot de passe : juste qui est connecté, sur quelle
-- caisse, et depuis quand — de quoi contrôler les heures de connexion.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.presence (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  "lastActive" BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for presence" ON public.presence;
CREATE POLICY "Public access for presence" ON public.presence FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
