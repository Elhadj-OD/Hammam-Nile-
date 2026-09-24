-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — PROFILS DES LAVEURS
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Le laveur n'a pas de compte ni de connexion — juste un nom, qu'on peut
-- déclarer ici avant son premier service. Les gains (commissions/bonus)
-- restent calculés depuis la table laveur_commissions, en faisant
-- correspondre le nom.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.laveurs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.laveurs ENABLE ROW LEVEL SECURITY;

-- Même modèle que les autres tables opérationnelles : ouvert à toute
-- l'équipe connectée (SELECT, INSERT, DELETE).
DROP POLICY IF EXISTS "Public read for laveurs" ON public.laveurs;
CREATE POLICY "Public read for laveurs" ON public.laveurs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert for laveurs" ON public.laveurs;
CREATE POLICY "Public insert for laveurs" ON public.laveurs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete for laveurs" ON public.laveurs;
CREATE POLICY "Public delete for laveurs" ON public.laveurs FOR DELETE USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.laveurs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
