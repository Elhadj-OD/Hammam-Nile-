-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — MONTANT BOUTIQUE SUR LES SERVICES HAMMAM
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Garde, sur chaque service hammam, le montant des articles boutique
-- achetés en même temps par le client (si applicable), pour l'afficher
-- à côté du prix du hammam dans le détail des services.
-- ==============================================================================

ALTER TABLE public.laveur_commissions ADD COLUMN IF NOT EXISTS "boutiqueTotal" NUMERIC;
