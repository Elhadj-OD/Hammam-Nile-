# Café DUGOUT — Le café des passionnés

Menu par QR code, caisse (POS), écran cuisine, inventaire du magasin (entrées, sorties vers le restaurant, stock), stats et paiements (Bankily, Masrivi, Sedad, Click, espèces).
Next.js 14 (App Router) + Supabase. PWA installable, mode hors-ligne.

## Mise en ligne en 6 étapes
1. **Supabase** : créer un projet, puis dans *SQL Editor* exécuter dans l'ordre
   `supabase/1_schema.sql` → `2_seed.sql` → `4_security_hardening.sql` → `5_category_icons.sql` → `6_inventory.sql`
   (`3_migration_choix_table.sql` seulement pour une base déjà existante).
2. **Comptes équipe** : *Authentication → Users → Add user*, puis
   `select public.promote_staff('email@exemple.mr','admin','Prénom');`
3. **GitHub** : pousser tout ce dossier (le projet Next.js est à la racine).
4. **Vercel** : *Add New Project* → importer le dépôt → **laisser Root Directory vide** → ajouter les variables ci-dessous → *Deploy*.
5. **Supabase → Authentication → URL Configuration** : mettre l'adresse Vercel dans *Site URL*.
6. **QR codes** : mettre l'adresse Vercel dans `qr/tables.json`, lancer `python qr/generate_qr.py`, imprimer le PDF.

## Variables d'environnement (Vercel → Settings → Environment Variables)
| Variable | Exposition | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | clé `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur seulement** | webhooks de paiement |
| `TABLE_TOKEN_SECRET` | **serveur seulement** | `openssl rand -base64 48` |
| `PAYMENT_SECRET_BANKILY` / `_MASRIVI` / `_SEDAD` / `_CLICK` | **serveur seulement** | clés webhook de chaque opérateur |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | serveur | limitation de débit (recommandé) |
| `NEXT_PUBLIC_SITE_URL` | public | adresse publique du site |

Modèle complet : `.env.local.example`.

## Local
```
npm install
cp .env.local.example .env.local   # puis remplir
npm run dev                        # http://localhost:3000
```

## Dossiers
`app/` pages et API · `components/` interface · `lib/` Supabase, sécurité, hors-ligne · `public/` icônes, PWA, images de marque ·
`supabase/` SQL · `qr/` QR des tables · `docs/` guides et audits · `tests/` tests de sécurité · `extras/` version HTML autonome.
