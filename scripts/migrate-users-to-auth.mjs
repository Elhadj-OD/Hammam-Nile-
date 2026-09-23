// ==============================================================================
// MIGRATION : anciens comptes en clair (initialData.ts) -> Supabase Auth
// ==============================================================================
// À exécuter UNE SEULE FOIS par la gérante/l'admin technique, après avoir
// exécuté supabase_add_profiles_auth.sql dans Supabase.
//
// Ce script ne s'exécute jamais dans le navigateur ni sur Vercel — c'est un
// outil ponctuel, lancé à la main depuis un poste de confiance :
//
//   node --env-file=.env.local scripts/migrate-users-to-auth.mjs
//
// (ou : exportez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans votre shell
// avant de lancer `node scripts/migrate-users-to-auth.mjs`)
//
// Pour chaque compte de la liste STAFF_SEED ci-dessous :
//   1. Crée un compte Supabase Auth avec un mot de passe temporaire généré
//      aléatoirement (les anciens mots de passe en clair ne sont PAS
//      réutilisés — ils sont définitivement invalidés).
//   2. Crée la ligne public.profiles correspondante, avec
//      must_change_password = true : le nouveau mot de passe temporaire
//      devra être changé dès la première connexion.
//   3. Affiche à la fin un tableau "identifiant -> mot de passe temporaire"
//      à transmettre en main propre à chaque membre de l'équipe. Ce tableau
//      n'est écrit dans AUCUN fichier — uniquement dans le terminal.
//
// Idempotent : relancer le script sur un compte déjà migré l'ignore
// simplement (affiché comme "déjà existant").
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Variables manquantes : SUPABASE_URL (ou VITE_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY doivent être définies dans votre environnement.'
  );
  process.exit(1);
}

const EMAIL_DOMAIN = 'hammamnile.local';
const usernameToEmail = username => `${username.toLowerCase()}@${EMAIL_DOMAIN}`;

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateTempPassword(length = 10) {
  const bytes = randomBytes(length);
  return Array.from(bytes, b => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

// Métadonnées non-secrètes des comptes existants (voir l'ancien
// src/data/initialData.ts, avant nettoyage). AUCUN mot de passe ici : le
// script en génère de nouveaux, aléatoires, pour chaque compte.
const STAFF_SEED = [
  { username: 'elhadj', name: 'Elhadj', role: 'caissier', gender: 'homme', department: 'boutique_homme', phone: '+222 46 12 34 56', avatar: 'EH' },
  { username: 'sophia', name: 'Sophia', role: 'gerant', gender: 'femme', phone: '+222 36 98 76 54', avatar: 'SO' },
  { username: 'femme', name: 'Caissière Boutique Femme', role: 'caissier', gender: 'femme', department: 'boutique_femme', avatar: 'BF' },
  { username: 'hammam', name: 'Caissière Hammam & Bains', role: 'caissier', gender: 'femme', department: 'hammam_bains', avatar: 'HB' },
  { username: 'spa', name: 'Caissière Spa & Massage', role: 'caissier', gender: 'femme', department: 'spa_massage', avatar: 'SM' },
  { username: 'coiffure', name: 'Caissière Coiffure & Salon', role: 'caissier', gender: 'femme', department: 'coiffure_salon', avatar: 'CS' },
];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function migrateOne(seed) {
  const { data: existing } = await admin.from('profiles').select('id').eq('username', seed.username).maybeSingle();
  if (existing) {
    return { username: seed.username, status: 'déjà existant', tempPassword: null };
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(seed.username),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { username: seed.username },
  });
  if (createErr || !created?.user) {
    return { username: seed.username, status: `ERREUR (auth): ${createErr?.message}`, tempPassword: null };
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    username: seed.username,
    name: seed.name,
    role: seed.role,
    gender: seed.gender || null,
    department: seed.department || null,
    avatar: seed.avatar || null,
    phone: seed.phone || null,
    must_change_password: true,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { username: seed.username, status: `ERREUR (profil): ${profileErr.message}`, tempPassword: null };
  }

  return { username: seed.username, status: 'créé', tempPassword };
}

const results = [];
for (const seed of STAFF_SEED) {
  results.push(await migrateOne(seed));
}

console.log('\n=== Résultat de la migration ===\n');
console.table(results.map(r => ({ Identifiant: r.username, Statut: r.status, 'Mot de passe temporaire': r.tempPassword || '—' })));
console.log(
  '\nTransmettez chaque mot de passe temporaire EN MAIN PROPRE à la personne concernée (jamais par SMS/WhatsApp/e-mail non chiffré). ' +
    "Chacune devra le changer dès sa première connexion à l'application.\n"
);
