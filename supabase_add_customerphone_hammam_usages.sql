-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — NUMÉRO DE CLIENT SUR LES PRÉLÈVEMENTS HAMMAM
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Ajoute le numéro de téléphone du client (utile côté hammam garçon,
-- VIP/Simple/Enfant) sur chaque entrée de prélèvement hammam, pour que
-- la gérante voit aussi ce numéro dans son suivi.
-- ==============================================================================

ALTER TABLE public.hammam_usages ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
