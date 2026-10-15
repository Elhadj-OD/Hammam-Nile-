-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — RETIRER LES PRESTATIONS HELWA HORS GRILLE (OPTIONNEL)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
--
-- Ces 7 prestations Helwa avaient été ajoutées avant que la grille officielle
-- soit connue (à 0 MRU, "prix à définir") et ne figurent PAS sur la grille :
--   194 Helwa - Sourcils            202 Helwa - Maillot intégral
--   206 Helwa - Doigts / Orteils    207 Helwa - Combo Visage
--   208 Helwa - Combo Haut du corps 209 Helwa - Combo Bas du corps
--   210 Helwa - Combo Complet
-- La grille a ses propres combinaisons (déjà ajoutées par le script
-- supabase_fix_prix_grille_officielle.sql). Lancer ce script les retire de la
-- caisse Épilation pour ne garder que la grille. Sans effet sur l'historique
-- (les ventes gardent le nom de la prestation telle qu'elle était vendue).
-- ==============================================================================

DELETE FROM public.products WHERE id IN (194, 202, 206, 207, 208, 209, 210);
