/**
 * POST /api/orders — création d'une commande client.
 *
 * C'est LE point d'entrée des commandes publiques. Le navigateur ne parle plus
 * directement à Supabase pour écrire : la requête traverse 5 barrières.
 *
 *   1. même origine (anti-CSRF)
 *   2. limitation de débit : 20 inscriptions/minute par IP
 *   3. validation stricte du JSON (Zod) — aucun prix accepté du client
 *   4. limitation de débit par table : 10 commandes/minute
 *   5. fonction SQL `client_place_order_secure` : re-vérifie la table,
 *      relit les prix dans `menu_items`, recalcule les totaux, déduplique
 *      par `client_ref` (idempotence en cas de renvoi hors-ligne)
 *
 * Les erreurs métier de la base sont renvoyées en 400 avec un message court ;
 * toute autre erreur devient un 500 générique (jamais de stack trace).
 */
import { supabaseAnon } from '@/lib/supabase/anon'
import { orderSchema, zodError } from '@/lib/security/schemas'
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'
import { clientIp, json, sameOrigin } from '@/lib/security/http'
import { CLIENT_ORDERING } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  // Commandes clients désactivées : seule l'équipe (serveur, gérant, admin) prend les commandes.
  if (!CLIENT_ORDERING) {
    return json({ error: 'disabled', message: 'Les commandes se font auprès de notre équipe.' }, 403)
  }

  // --- 1. anti-CSRF -------------------------------------------------------
  if (!sameOrigin(req)) {
    return json({ error: 'cross_origin', message: 'Origine non autorisée' }, 403)
  }

  // --- 2. débit par IP ----------------------------------------------------
  const ip = clientIp(req)
  const ipLimit = await rateLimit({ key: `order:ip:${ip}`, limit: 20, windowMs: 60_000 })
  if (!ipLimit.ok) {
    return json(
      { error: 'rate_limited', message: 'Trop de commandes, patientez une minute.' },
      429,
      { ...rateLimitHeaders(ipLimit), 'retry-after': String(ipLimit.retryAfter) }
    )
  }

  // --- 3. validation stricte ---------------------------------------------
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'validation_error', message: 'JSON invalide' }, 400)
  }
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) return json(zodError(parsed.error), 400)
  const data = parsed.data

  // --- 4. débit par table (une table ne peut pas être mitraillée) ---------
  const tableKey = data.table || data.qr_token?.slice(0, 12) || 'inconnu'
  const tableLimit = await rateLimit({ key: `order:table:${tableKey}`, limit: 10, windowMs: 60_000 })
  if (!tableLimit.ok) {
    return json(
      { error: 'rate_limited', message: 'Cette table vient de commander, patientez un instant.' },
      429,
      { ...rateLimitHeaders(tableLimit), 'retry-after': String(tableLimit.retryAfter) }
    )
  }

  // --- 5. base de données -------------------------------------------------
  const sb = supabaseAnon()
  if (!sb) return json({ error: 'not_configured', message: 'Supabase non configuré' }, 503)

  const { data: result, error } = await sb.rpc('client_place_order_secure', {
    p_code: data.table || null,
    p_token: data.qr_token || null,
    p_items: data.items.map(i => ({ menu_item_id: i.menu_item_id, qty: i.qty, note: i.note || null })),
    p_note: data.note || null,
    p_client_ref: data.client_ref
  })

  if (error) {
    // pgrst / postgres renvoie un message métier court : on le transmet tel quel
    return json({ error: 'order_refused', message: String(error.message || 'Commande refusée') }, 400)
  }

  return json({ ok: true, order_id: result?.order_id || null, order: result?.order || null }, 200)
}
