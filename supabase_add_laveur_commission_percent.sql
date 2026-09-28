-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — COMMISSION EN POURCENTAGE (Boutique Femme/Hammam)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Côté Boutique Femme/Hammam, la caissière peut désormais taper elle-même
-- un pourcentage de commission au lieu du montant fixe de la grille
-- VIP/Simple/Enfant. Ce champ garde une trace du pourcentage utilisé (vide
-- si la commission fixe classique a été utilisée, comme côté Boutique/Elhadj).
-- ==============================================================================

ALTER TABLE public.laveur_commissions ADD COLUMN IF NOT EXISTS "commissionPercent" NUMERIC;
