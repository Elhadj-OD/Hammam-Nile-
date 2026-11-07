/**
 * Petits utilitaires HTTP partagés par les routes /api.
 * Aucune dépendance : utilisable en runtime Node comme en Edge.
 */

/** IP réelle du client (derrière Vercel / un proxy). */
export function clientIp(req) {
  const h = req.headers
  const xff = h.get('x-forwarded-for') || ''
  return (xff.split(',')[0] || h.get('x-real-ip') || h.get('cf-connecting-ip') || 'inconnu').trim()
}

/** Réponse JSON normalisée (jamais de stack trace renvoyée au client). */
export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  })
}

/**
 * Anti-CSRF minimal pour les routes mutantes : l'en-tête `Origin`
 * doit correspondre à l'hôte de la requête (ou être absent pour les
 * clients non-navigateur, ex. webhooks serveur à serveur).
 */
export function sameOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin) return true // curl / webhook / server-to-server
  const host = req.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Erreur « propre » : message court, code stable, pas de détail interne. */
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
  toResponse() {
    return json({ error: this.code, message: this.message, ...this.extra }, this.status)
  }
}

/** Enveloppe un handler : convertit HttpError en réponse, masque le reste. */
export function guarded(handler) {
  return async function (req, ctx) {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof HttpError) return e.toResponse()
      console.error('[api] erreur interne:', e?.message)
      return json({ error: 'internal_error', message: 'Erreur interne' }, 500)
    }
  }
}
