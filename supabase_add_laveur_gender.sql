-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — GENRE DES LAVEURS (équipes homme/femme séparées)
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger : ne touche à aucune donnée existante, peut être relancé
-- plusieurs fois sans problème.
--
-- Les laveurs hommes (caisse Boutique/Elhadj) et les laveuses femmes
-- (caisse Boutique Femme/Hammam) sont deux équipes séparées : chaque
-- caisse ne doit voir/choisir que les siens. Les laveurs déjà enregistrés
-- avant cette mise à jour auront gender = NULL — à corriger une fois dans
-- l'app (fiche du laveur) pour qu'ils réapparaissent dans la bonne caisse.
-- ==============================================================================

ALTER TABLE public.laveurs ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('homme', 'femme'));
