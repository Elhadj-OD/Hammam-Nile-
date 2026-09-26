-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — DÉCHARGE PAR CAISSE (suivi de supabase_add_decharges.sql)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : peut être relancé plusieurs fois sans problème.
--
-- Changement de modèle demandé par la gérante : la décharge n'est plus une
-- clôture globale faite par la gérante, mais une clôture PAR CAISSE faite
-- par chaque caissière elle-même (une décharge par jour ET par caisse,
-- ex: une pour Boutique Homme, une pour Boutique Femme+Hammam, etc.).
-- Une fois faite, elle est DÉFINITIVE : aucune policy d'UPDATE n'est
-- accordée dans l'app, donc personne ne peut la corriger depuis l'app
-- après coup (seul un accès direct à Supabase, hors app, le pourrait).
-- La gérante n'a plus accès à cet écran dans l'app (retiré côté UI) ;
-- elle garde uniquement un accès en lecture pour ses propres besoins de
-- suivi si nécessaire, mais rien n'est plus modifiable par personne via
-- l'app une fois la caisse clôturée.
-- ==============================================================================

-- La table n'existait pas encore chez vous (le tout premier script
-- "supabase_add_decharges.sql" n'a jamais été lancé) : on la crée ici avec
-- le schéma déjà à jour. Si elle existe déjà, ce bloc ne fait rien.
CREATE TABLE IF NOT EXISTS public.decharges (
  id BIGSERIAL PRIMARY KEY,
  "dateDecharge" TEXT NOT NULL,
  "department" TEXT,
  "totalEspeceCalcule" NUMERIC NOT NULL DEFAULT 0,
  "totalMobileMoneyCalcule" NUMERIC NOT NULL DEFAULT 0,
  "nombreTransactions" INT NOT NULL DEFAULT 0,
  "montantEspeceReel" NUMERIC NOT NULL DEFAULT 0,
  "montantMobileMoneyReel" NUMERIC NOT NULL DEFAULT 0,
  "ecartEspece" NUMERIC NOT NULL DEFAULT 0,
  "ecartMobileMoney" NUMERIC NOT NULL DEFAULT 0,
  "faitPar" TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.decharges ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE public.decharges ENABLE ROW LEVEL SECURITY;

-- Retire l'ancienne contrainte "une seule décharge par jour" (globale) —
-- recherchée dynamiquement pour ne pas dépendre du nom exact généré par
-- Postgres — et la remplace par "une seule décharge par jour ET par caisse".
DO $$
DECLARE
  cname text;
BEGIN
  -- Si jamais ce bloc est exécuté seul (sans le CREATE TABLE au-dessus),
  -- on ne casse rien : on sort simplement sans rien faire.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decharges') THEN
    RETURN;
  END IF;

  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'decharges'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'dateDecharge'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.decharges DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_decharges_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_decharges_date_department
  ON public.decharges("dateDecharge", "department");

-- Retire les anciennes policies "gérante uniquement" pour l'écriture.
DROP POLICY IF EXISTS "Gerant insert decharges" ON public.decharges;
DROP POLICY IF EXISTS "Gerant update decharges" ON public.decharges;
DROP POLICY IF EXISTS "Gerant read decharges" ON public.decharges;

-- Lecture : chaque caissière voit uniquement les décharges de sa propre
-- caisse (son département) ; la gérante continue de tout voir (accès
-- direct via Supabase si besoin, même si retiré de l'interface).
CREATE POLICY "Own department read decharges" ON public.decharges FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'gerant' OR profiles.department = decharges.department)
  )
);

-- Création : une caissière ne peut créer une décharge que pour SA PROPRE
-- caisse (son département doit correspondre à celui de la ligne insérée).
CREATE POLICY "Own department insert decharges" ON public.decharges FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'caissier'
      AND profiles.department = decharges.department
  )
);

-- Aucune policy UPDATE ni DELETE : une fois créée, une décharge est
-- définitive pour tout le monde depuis l'app (y compris la gérante).

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.decharges;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
