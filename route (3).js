/**
 * GET /api/table/session?s=<jeton signé>
 *
 * Le QR de session contient un jeton signé (HMAC, 15 min par défaut), pas un
 * numéro de table en clair. Cette route est le seul endroit qui sait le
 * décoder : le secret `TABLE_TOKEN_SECRET` reste sur le serveur.
 *
 * Réponses : 200 {table, exp} | 400 jeton invalide/expiré | 429 trop d'appels
 */
import { verifyTableToken } from '@/lib/security/qr'
import { rateLimit, rateLimitHeaders } from '@/lib/security/rate-limit'
import { clientIp, json } from '@/lib/security/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const ip = clientIp(req)
  const rl = await rateLimit({ key: `table:session:${ip}`, limit: 60, windowMs: 60_000 })
  if (!rl.ok) {
    return json({ error: 'rate_limited' }, 429, { ...rateLimitHeaders(rl), 'retry-after': String(rl.retryAfter) })
  }

  const s = new URL(req.url).searchParams.get('s') || ''
  const res = verifyTableToken(s)
  if (!res.ok) {
    return json({ error: 'invalid_token', reason: res.reason, message: 'QR expiré ou invalide' }, 400)
  }
  return json({ ok: true, table: res.code, exp: res.exp }, 200, { 'cache-control': 'no-store' })
}
