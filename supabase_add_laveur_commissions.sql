-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — TABLE COMMISSIONS LAVEURS
-- À copier-coller EN ENTIER dans Supabase > SQL Editor (pas Logs), puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Remplace les décharges manuelles : pour chaque service, la caissière
-- choisit le laveur et le type de client (VIP/Simple/Enfant), et
-- l'application calcule automatiquement la commission fixe selon la
-- grille (VIP: 2000, Simple: 700, Enfant: 500), plus un bonus/pourboire
-- optionnel saisi librement.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.laveur_commissions (
  id BIGSERIAL PRIMARY KEY,
  "laveurName" TEXT NOT NULL,
  "clientType" TEXT NOT NULL CHECK ("clientType" IN ('vip', 'simple', 'enfant')),
  price NUMERIC NOT NULL,
  commission NUMERIC NOT NULL,
  bonus NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  payment TEXT NOT NULL DEFAULT 'cash' CHECK (payment IN ('cash', 'mobile')),
  "paymentDetail" TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  "recordedBy" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la table existait déjà (premier passage avant l'ajout du mode de
-- paiement), ajoute les colonnes sans rien casser.
ALTER TABLE public.laveur_commissions ADD COLUMN IF NOT EXISTS payment TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE public.laveur_commissions ADD COLUMN IF NOT EXISTS "paymentDetail" TEXT;

CREATE INDEX IF NOT EXISTS idx_laveur_commissions_timestamp ON public.laveur_commissions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_laveur_commissions_laveur ON public.laveur_commissions("laveurName");

ALTER TABLE public.laveur_commissions ENABLE ROW LEVEL SECURITY;

-- Lecture/écriture ouvertes à l'app (même modèle que les autres tables
-- opérationnelles) : SELECT, INSERT, DELETE (pour corriger une saisie
-- erronée) — pas d'UPDATE, une commission se corrige en supprimant et
-- ressaisissant, pas en modifiant une ligne existante.
DROP POLICY IF EXISTS "Public read for laveur_commissions" ON public.laveur_commissions;
CREATE POLICY "Public read for laveur_commissions" ON public.laveur_commissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert for laveur_commissions" ON public.laveur_commissions;
CREATE POLICY "Public insert for laveur_commissions" ON public.laveur_commissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete for laveur_commissions" ON public.laveur_commissions;
CREATE POLICY "Public delete for laveur_commissions" ON public.laveur_commissions FOR DELETE USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.laveur_commissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
