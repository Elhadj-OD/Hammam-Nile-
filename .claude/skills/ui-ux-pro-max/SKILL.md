---
name: ui-ux-pro-max
description: "Reference UI/UX design data (palettes, typographie, styles, guidelines UX, patterns de layout) pour guider les décisions visuelles sur ce projet. À utiliser lors de la conception ou de l'amélioration de pages, composants, couleurs, typographie ou mise en page."
---

# UI/UX Pro Max — Données de référence design

Sous-ensemble texte (extrait manuellement, sans code exécutable) du projet
[ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) :
palettes de couleurs, associations de polices, styles visuels, guidelines UX,
patterns de landing page/charts, et notes spécifiques React + Tailwind.

Le script de recherche Python original (`search.py`) n'a volontairement pas
été inclus — seuls les fichiers de données et de référence (`.csv`/`.md`) sont
présents. Pour trouver une info, lire directement le fichier concerné (Read
ou Grep) plutôt que d'invoker un script.

## Fichiers disponibles

| Fichier | Contenu |
|---|---|
| `references/quick-reference.md` | Les 119 guidelines UX classées par priorité (accessibilité, tactile, perf, layout, typo/couleur, animation, formulaires, navigation, charts) |
| `references/pro-rules.md` | Checklist de pré-livraison (icônes, feedback tactile, contraste clair/sombre) |
| `data/colors.csv` | Palettes de couleurs par type de produit/ambiance |
| `data/typography.csv` | Associations de polices |
| `data/styles.csv` | Styles visuels (minimal, glassmorphism, bento, etc.) |
| `data/products.csv` | Patterns par type de produit |
| `data/ux-guidelines.csv` | Détail des guidelines UX |
| `data/ui-reasoning.csv` | Règles de cohérence pour construire un système de design |
| `data/landing.csv` | Structures de page d'accueil/landing |
| `data/charts.csv` | Recommandations pour graphiques/tableaux de bord |
| `data/motion.csv` | Timings et principes d'animation |
| `data/icons.csv` | Recommandations d'icônes |
| `data/app-interface.csv` | Guidelines interface applicative |
| `data/react-performance.csv` | Bonnes pratiques de performance React |
| `data/stacks/react.csv`, `data/stacks/html-tailwind.csv` | Notes d'implémentation spécifiques à ce projet (React + Tailwind) |

## Priorités (résumé de `quick-reference.md`)

| Priorité | Catégorie | Points clés |
|---|---|---|
| 1 | Accessibilité | Contraste 4.5:1, alt text, navigation clavier |
| 2 | Tactile & interaction | Taille min. 44×44px, espacement 8px+, retour visuel |
| 3 | Performance | WebP/AVIF, lazy loading, éviter le layout shift |
| 4 | Choix de style | Cohérence, icônes SVG (pas d'emoji comme icône) |
| 5 | Layout & responsive | Mobile-first, pas de scroll horizontal |
| 6 | Typo & couleur | Base 16px, line-height 1.5, tokens sémantiques |
| 7 | Animation | Timing cohérent, respect de `prefers-reduced-motion` |
| 8 | Formulaires | Labels visibles, erreurs près du champ concerné |
| 9 | Navigation | Retour prévisible, hiérarchie claire |
| 10 | Charts | Légendes, tooltips, ne pas se fier qu'à la couleur |

Consulter `references/quick-reference.md` pour le détail des 119 règles.
