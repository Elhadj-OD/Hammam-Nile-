-- ==============================================================================
-- BOUTIQUE HAMMAM NILE — EMPLOYÉES BRUSHING
-- À copier-coller EN ENTIER dans Supabase > SQL Editor, puis "Run".
-- Sans danger, peut être relancé plusieurs fois : les doublons sont ignorés.
-- ==============================================================================

INSERT INTO public.employees (name, category) VALUES
  ('Fatima', 'brushing'),
  ('Sora', 'brushing'),
  ('Houda', 'brushing'),
  ('Khadi', 'brushing'),
  ('Biya', 'brushing'),
  ('Khadija', 'brushing'),
  ('Salimata', 'brushing'),
  ('Coumbis', 'brushing'),
  ('Oumou', 'brushing')
ON CONFLICT (name, category) DO NOTHING;
