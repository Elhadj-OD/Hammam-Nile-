/**
 * Contrôle de configuration au démarrage.
 * Objectif : refuser de démarrer en production avec une sécurité incomplète,
 * plutôt que de servir des paiements non vérifiés.
 *
 * Appelé par app/layout.js (Server Component) : le résultat est mis en cache.
 */
const cache = { done: false, missing: [] }

export function securityEnvStatus() {
  if (cache.done) return cache.missing
  cache.done = true
  const need = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TABLE_TOKEN_SECRET'
  ]
  cache.missing = need.filter(k => !process.env[k])
  if (process.env.NODE_ENV === 'production' && cache.missing.length) {
    console.warn('[sécurité] variables manquantes :', cache.missing.join(', '))
  }
  return cache.missing
}

/** Vrai si les webhooks peuvent être vérifiés (au moins un secret configuré). */
export function paymentsConfigured() {
  return ['BANKILY', 'MASRIVI', 'SEDAD', 'CLICK'].some(p => Boolean(process.env['PAYMENT_SECRET_' + p]))
}
