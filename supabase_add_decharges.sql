-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — CLÔTURE JOURNALIÈRE (DÉCHARGE)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- La décharge ne fait PAS ressaisir les paiements : les totaux "calculés"
-- (espèces / mobile money) sont additionnés automatiquement à partir de ce
-- qui est déjà enregistré à la Caisse (table sales) et au Hammam (table
-- laveur_commissions) pour la journée choisie. La gérante saisit juste ce
-- qu'elle compte réellement (espèces en caisse, solde mobile money), et
-- l'écart (réel - calculé) est calculé et affiché automatiquement.
--
-- Contrairement aux autres tables opérationnelles (ouvertes à toute
-- l'équipe connectée), seule la gérante peut créer, voir et corriger une
-- décharge — les caissières n'y ont pas accès.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.decharges (
  id BIGSERIAL PRIMARY KEY,
  "dateDecharge" TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS idx_decharges_date ON public.decharges("dateDecharge");

ALTER TABLE public.decharges ENABLE ROW LEVEL SECURITY;

-- Seule la gérante (profiles.role = 'gerant') peut lire/écrire — vérifié
-- via la session Supabase Auth de l'appelant (auth.uid()), pas une simple
-- policy publique comme les autres tables.
DROP POLICY IF EXISTS "Gerant read decharges" ON public.decharges;
CREATE POLICY "Gerant read decharges" ON public.decharges FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant insert decharges" ON public.decharges;
CREATE POLICY "Gerant insert decharges" ON public.decharges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant update decharges" ON public.decharges;
CREATE POLICY "Gerant update decharges" ON public.decharges FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.decharges;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
