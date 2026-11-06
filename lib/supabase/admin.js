/**
 * Client Supabase « service_role » — UNIQUEMENT côté serveur.
 *
 * Pourquoi : les webhooks de paiement doivent écrire dans des tables que le
 * rôle `anon` ne peut pas toucher (webhook_events, payment_intents).
 * Le `service_role` contourne la RLS : il ne doit donc jamais sortir du serveur.
 *
 * Garde-fous :
 *  - la clé est lue dans `SUPABASE_SERVICE_ROLE_KEY` (sans préfixe NEXT_PUBLIC_,
 *    donc absente du bundle navigateur) ;
 *  - l'import dans un contexte navigateur lève une erreur immédiate ;
 *  - le client est créé sans persistance de session.
 */
import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('service_role interdit côté navigateur')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-cc-admin': '1' } }
  })
}
