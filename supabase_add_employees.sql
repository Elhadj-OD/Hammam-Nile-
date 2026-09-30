-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — EMPLOYÉES (Coiffure & Salon, Épilation, Esthétique)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- L'employée n'a pas de compte ni de connexion — juste un nom rattaché à
-- une caisse (category), sélectionné par la caissière quand elle enregistre
-- un service. Équivalent du "laveur" côté Hammam, mais sans commission.
-- Pour le Hammam (category "hammam_bains"), cette table sert aux
-- CAISSIÈRES (qui tiennent la caisse) — le laveur reste dans la table
-- "laveurs" à part. Le genre sépare alors les équipes homme/femme.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('homme', 'femme')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, category)
);

-- Si la table existait déjà avant l'ajout du genre (Hammam Homme/Femme).
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('homme', 'femme'));

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Même modèle que les autres tables opérationnelles : ouvert à toute
-- l'équipe connectée (SELECT, INSERT, DELETE).
DROP POLICY IF EXISTS "Public read for employees" ON public.employees;
CREATE POLICY "Public read for employees" ON public.employees FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert for employees" ON public.employees;
CREATE POLICY "Public insert for employees" ON public.employees FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete for employees" ON public.employees;
CREATE POLICY "Public delete for employees" ON public.employees FOR DELETE USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajoute la colonne "employeeName" sur les ventes (services), pour retenir
-- quelle employée a réalisé chaque prestation. Sans effet si déjà présente.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS "employeeName" TEXT;
