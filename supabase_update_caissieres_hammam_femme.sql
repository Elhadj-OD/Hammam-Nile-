-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — MISE À JOUR CAISSIÈRES HAMMAM FEMME
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
--
-- Remplace la liste précédente des caissières Hammam Femme (quelques noms
-- corrigés : Houdou → Houda, Kadia → Khadija) par la liste finale
-- communiquée. Le côté Hammam Homme (Elhadj, Thierno) n'est pas touché.
-- ==============================================================================

DELETE FROM public.employees WHERE category = 'hammam_bains' AND gender = 'femme';

INSERT INTO public.employees (name, category, gender) VALUES
  ('Fatima', 'hammam_bains', 'femme'),
  ('Sora', 'hammam_bains', 'femme'),
  ('Houda', 'hammam_bains', 'femme'),
  ('Khadi', 'hammam_bains', 'femme'),
  ('Biya', 'hammam_bains', 'femme'),
  ('Khadija', 'hammam_bains', 'femme'),
  ('Salimata', 'hammam_bains', 'femme'),
  ('Coumbis', 'hammam_bains', 'femme'),
  ('Oumou', 'hammam_bains', 'femme')
ON CONFLICT (name, category) DO NOTHING;
