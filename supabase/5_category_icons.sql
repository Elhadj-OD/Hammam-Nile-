-- ============================================================================
-- CAFÉ DUGOUT — 5. Icônes de rubriques modifiables depuis l'admin
-- À exécuter une fois (SQL Editor). Réutilise le bucket public « menu » (PNG/JPG/WebP, 2 Mo).
-- ============================================================================
alter table public.categories add column if not exists icon_url text;

-- Lecture publique : déjà couverte par le grant select de 1_schema.sql.
-- Écriture : réservée à l'admin (policy categories_admin) + droit de colonne explicite.
grant update (icon_url) on public.categories to authenticated;

comment on column public.categories.icon_url is
  'URL publique (bucket menu/icones/…) de l''icône ronde affichée en haut du menu client ; null = icône par défaut.';
