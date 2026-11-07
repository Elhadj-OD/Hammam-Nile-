/**
 * Jetons de table signés (QR « de session »).
 *
 * Deux niveaux de protection coexistent :
 *
 * A. QR imprimé (collé sur la table) — `?t=T05&k=<qr_token>`
 *    `qr_token` est un secret opaque stocké en base, lisible seulement par
 *    l'équipe. Il ne permet PAS de lire la liste des tables, ni les autres jetons.
 *
 * B. Jeton de session signé — `?s=v1.<payload>.<signature>`
 *    généré par l'équipe (ou par un écran à la table), valable 15 minutes par
 *    défaut. Il prouve que la table a été ouverte récemment, sans transporter
 *    le secret permanent sur le papier. Le client ne peut pas le fabriquer :
 *    la clé `TABLE_TOKEN_SECRET` ne quitte jamais le serveur.
 *
 * Un code de table seul (`?t=T05`) n'autorise plus la commande après le
 * durcissement : voir /api/orders et la fonction SQL client_place_order_secure.
 */
import crypto from 'node:crypto'

const VERSION = 'v1'
const DEFAULT_TTL = 15 * 60 // 15 minutes

function secret() {
  const s = process.env.TABLE_TOKEN_SECRET || ''
  return s.length >= 16 ? s : ''
}

const b64url = buf => Buffer.from(buf).toString('base64url')

function hmac(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(`${VERSION}.${payloadB64}`).digest('base64url').slice(0, 32)
}

/**
 * Fabrique un jeton pour une table.
 * @param {string} code  ex. 'T05'
 * @param {number} ttlSec durée de validité en secondes (défaut 900)
 */
export function signTableToken(code, ttlSec = DEFAULT_TTL, nowMs = Date.now()) {
  if (!secret()) throw new Error('TABLE_TOKEN_SECRET manquant (32+ caractères recommandés)')
  if (!/^(T(0[1-9]|1[0-9]|20)|EMP)$/.test(code)) throw new Error('Code table invalide')
  const payload = { c: code, e: Math.floor(nowMs / 1000) + ttlSec, n: crypto.randomBytes(6).toString('base64url') }
  const p = b64url(JSON.stringify(payload))
  return `${VERSION}.${p}.${hmac(p)}`
}

/**
 * Vérifie un jeton.
 * @returns {{ok: true, code: string, exp: number} | {ok: false, reason: string}}
 */
export function verifyTableToken(token, nowMs = Date.now()) {
  if (!secret()) return { ok: false, reason: 'secret_absent' }
  if (typeof token !== 'string') return { ok: false, reason: 'format' }
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return { ok: false, reason: 'format' }

  const [, p, sig] = parts
  const expected = hmac(p)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'signature' }

  let payload
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'payload' }
  }
  if (!payload?.c || !payload?.e) return { ok: false, reason: 'payload' }
  if (payload.e * 1000 < nowMs) return { ok: false, reason: 'expire' }
  return { ok: true, code: String(payload.c), exp: payload.e }
}

/** URL complète à encoder dans un QR de session. */
export function tableUrl(baseUrl, code, ttlSec = DEFAULT_TTL) {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  return `${base}/?s=${encodeURIComponent(signTableToken(code, ttlSec))}`
}
