/**
 * POST /api/payments/webhook/[provider] — notification de paiement.
 *
 * Opérateurs : bankily | masrivi | sedad | click
 *
 * Sécurité (dans cet ordre) :
 *   1. limitation de débit (120/min par IP) — un webhook n'est pas un endpoint public
 *   2. secret lu dans l'environnement SERVEUR (PAYMENT_SECRET_<PROVIDER>)
 *   3. signature recalculée sur le CORPS BRUT et comparée en temps constant
 *   4. fenêtre temporelle anti-rejeu (5 min)
 *   5. validation Zod du contenu (montant, référence, statut)
 *   6. idempotence : `webhook_events` a une contrainte unique (provider, event_id).
 *      Un renvoi du même événement répond 200 « duplicate » sans re-créditer.
 *   7. écriture via `service_role` (jamais exposé au navigateur) dans une
 *      fonction SQL qui re-vérifie le montant attendu de la commande.
 *
 * Ne jamais répondre 200 sans avoir vérifié : ce serait accepter un faux paiement.
 */
import { PROVIDERS, verifyWebhook } from '@/lib/security/signature'
import { webhookSchema, zodError } from '@/lib/security/schemas'
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'
import { clientIp, json } from '@/lib/security/http'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
  const provider = String(params?.provider || '').toLowerCase()

  // 1. débit
  const ip = clientIp(req)
  const rl = await rateLimit({ key: `webhook:${provider}:${ip}`, limit: 120, windowMs: 60_000 })
  if (!rl.ok) return json({ error: 'rate_limited' }, 429, { ...rateLimitHeaders(rl) })

  if (!PROVIDERS[provider]) return json({ error: 'unknown_provider' }, 404)

  // 2. corps brut (indispensable : re-sérialiser le JSON casse la signature)
  const rawBody = await req.text()

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json({ error: 'validation_error', message: 'JSON invalide' }, 400)
  }

  // 3-4. signature + horodatage
  const secret = process.env['PAYMENT_SECRET_' + provider.toUpperCase()] || ''
  const check = verifyWebhook({ provider, secret, rawBody, headers: req.headers, payload })
  if (!check.ok) {
    console.warn('[webhook] refusé', provider, check.reason)
    // 401 volontairement générique : ne pas aider un attaquant à deviner
    return json({ error: 'invalid_signature', message: 'Signature invalide' }, 401)
  }

  // 5. contenu
  const parsed = webhookSchema.safeParse(payload)
  if (!parsed.success) return json(zodError(parsed.error), 400)
  const evt = parsed.data

  // 6-7. idempotence + écriture
  const admin = supabaseAdmin()
  if (!admin) return json({ error: 'not_configured' }, 503)

  const { data, error } = await admin.rpc('webhook_apply_payment', {
    p_provider: provider,
    p_event_id: evt.event_id,
    p_reference: evt.reference,
    p_amount: evt.amount,
    p_status: evt.status,
    p_payload: payload
  })

  if (error) {
    console.error('[webhook] erreur base', provider, error.message)
    // 5xx : l'opérateur réessaiera — c'est voulu, l'idempotence protège du doublon
    return json({ error: 'internal_error', message: 'Traitement impossible' }, 500)
  }

  return json({ ok: true, duplicate: Boolean(data?.duplicate), result: data?.result ?? null }, 200)
}
