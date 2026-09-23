import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

// Client "admin" côté serveur uniquement : utilise la clé service_role,
// qui contourne RLS. Ne JAMAIS importer ce fichier depuis du code qui
// tourne dans le navigateur (dossier src/) — il n'est valide que dans
// api/*.ts (fonctions serverless Vercel), où process.env.* reste privé.
let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Configuration Supabase manquante côté serveur (VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  cachedAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}

// Adresse interne utilisée comme identifiant Supabase Auth (jamais réelle,
// jamais envoyée nulle part) : le staff continue de se connecter avec
// juste son "identifiant" (username), l'e-mail synthétique reste un
// détail d'implémentation invisible pour eux. Copie identique dans
// src/lib/supabaseAuth.ts (petite fonction pure, dupliquée volontairement
// car ce fichier ne doit jamais être importé côté navigateur).
const EMAIL_DOMAIN = 'hammamnile.local';
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generateTempPassword(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, b => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

export interface CallerProfile {
  id: string;
  username: string;
  role: 'caissier' | 'gerant';
}

/**
 * Valide le token Bearer envoyé par le client et renvoie le profil de
 * l'appelant (id + rôle), ou null si le token est absent/invalide.
 * C'est la SEULE source de vérité pour "qui appelle" : jamais un champ
 * du corps de la requête (facilement falsifiable côté client).
 */
export async function getCallerProfile(authHeader: string | undefined): Promise<CallerProfile | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, username, role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr || !profile) return null;
  return profile as CallerProfile;
}
