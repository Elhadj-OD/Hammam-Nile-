-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — CAISSIÈRE SUR LES SERVICES HAMMAM
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Plusieurs personnes se relaient sur le même compte caissière côté
-- Hammam Femme : cette colonne retient laquelle était en caisse pour
-- chaque service, en plus du laveur qui a réalisé le soin.
-- ==============================================================================

ALTER TABLE public.laveur_commissions ADD COLUMN IF NOT EXISTS "cashierName" TEXT;
