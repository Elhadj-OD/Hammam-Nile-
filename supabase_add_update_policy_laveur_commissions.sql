-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — AUTORISE LA MODIFICATION D'UNE COMMISSION HAMMAM
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- À l'origine, une commission mal saisie se corrigeait en la supprimant
-- et en la ressaisissant (pas de policy UPDATE). La caissière peut
-- maintenant modifier directement un service déjà enregistré (type de
-- client, bonus, mode de paiement, numéro du client) sans le supprimer.
-- ==============================================================================

DROP POLICY IF EXISTS "Public update for laveur_commissions" ON public.laveur_commissions;
CREATE POLICY "Public update for laveur_commissions" ON public.laveur_commissions FOR UPDATE USING (true) WITH CHECK (true);
