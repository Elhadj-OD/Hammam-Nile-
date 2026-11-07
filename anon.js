/**
 * Client Supabase public (rôle `anon`), sans session.
 * Utilisé côté serveur pour les appels publics (commande client) :
 * l'appel part du serveur, jamais directement du navigateur, ce qui permet
 * de valider, limiter et journaliser avant d'atteindre la base.
 */
import { createClient } from '@supabase/supabase-js'

export function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}
