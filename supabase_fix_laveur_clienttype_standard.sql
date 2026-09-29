-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — AUTORISE LE PALIER "STANDARD" (600 MRU)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Le hammam homme a maintenant 4 paliers (VIP/Standard/Simple/Enfant) au
-- lieu de 3. Si la table laveur_commissions existait déjà avec l'ancienne
-- contrainte (vip/simple/enfant seulement), ce script la remplace pour
-- autoriser aussi "standard". Si la table vient d'être créée avec la bonne
-- contrainte, ce script ne fait rien.
-- ==============================================================================

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'laveur_commissions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%clientType%'
  LOOP
    EXECUTE format('ALTER TABLE public.laveur_commissions DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.laveur_commissions
  ADD CONSTRAINT laveur_commissions_clienttype_check
  CHECK ("clientType" IN ('vip', 'standard', 'simple', 'enfant'));
