-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — AUTORISE LA RÉINITIALISATION DE L'HISTORIQUE (gérante)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger à lancer : ce script ne supprime RIEN lui-même, il ajoute
-- seulement les permissions nécessaires au bouton "Réinitialiser
-- l'historique" (Paramètres), qui reste à utiliser depuis l'app.
--
-- Avant ce script, "sales" et "stock_movements" n'avaient aucune
-- permission de suppression (même la gérante ne pouvait rien supprimer) ;
-- "decharges" était volontairement définitive (aucune suppression possible
-- pour personne). Ce script ouvre la suppression sur ces 3 tables, mais
-- UNIQUEMENT pour un compte gérante (profiles.role = 'gerant') — une
-- caissière ne peut toujours rien supprimer ici.
-- ==============================================================================

DROP POLICY IF EXISTS "Gerant delete sales" ON public.sales;
CREATE POLICY "Gerant delete sales" ON public.sales FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant delete stock_movements" ON public.stock_movements;
CREATE POLICY "Gerant delete stock_movements" ON public.stock_movements FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

DROP POLICY IF EXISTS "Gerant delete decharges" ON public.decharges;
CREATE POLICY "Gerant delete decharges" ON public.decharges FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'gerant')
);

-- "clients" et "laveur_commissions" ont déjà une permission de suppression
-- ouverte à toute l'équipe connectée — rien à changer pour ces deux-là.
