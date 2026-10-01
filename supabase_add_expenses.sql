-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — DÉPENSES (achats marché/fournisseur)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune table existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Permet d'enregistrer les produits achetés au marché ou chez un
-- fournisseur (nom, prix, quantité, note), pour savoir combien est dépensé
-- chaque mois en dehors des ventes. Comme les décharges, réservé à la
-- gérante uniquement — les caissières n'y ont pas accès.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  qty NUMERIC,
  notes TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  "addedBy" TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON public.expenses(timestamp DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Seule la gérante (profiles.role = 'gerant') peut lire/écrire — vérifié
-- via la session Supabase Auth de l'appelant (auth.uid()), pas une simple
-- policy publique comme les tables opérationnelles.
DROP POLICY IF EXISTS "Gerant read expenses" ON public.expenses;
CREATE POLICY "Gerant read expenses" ON public.expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant insert expenses" ON public.expenses;
CREATE POLICY "Gerant insert expenses" ON public.expenses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant delete expenses" ON public.expenses;
CREATE POLICY "Gerant delete expenses" ON public.expenses FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
