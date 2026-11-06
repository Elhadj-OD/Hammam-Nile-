/**
 * Limitation de débit (rate limiting).
 *
 * Deux implémentations derrière la même API :
 *  1. Redis (Upstash REST) si UPSTASH_REDIS_REST_URL + _TOKEN sont définis
 *     -> indispensable en production multi-instances (Vercel = plusieurs lambdas).
 *  2. Mémoire (Map) sinon -> parfait en local, mono-instance, et comme repli
 *     si Redis ne répond pas (on ne bloque jamais le service pour ça).
 *
 * Algorithme : compteur à fenêtre fixe. Simple, prévisible, suffisant pour
 * bloquer le brute-force et le spam de commandes. Pour un lissage parfait,
 * remplacer par un token bucket — même signature.
 *
 * Usage :
 *   const r = await rateLimit({ key: 'order:' + ip, limit: 20, windowMs: 60_000 })
 *   if (!r.ok) return json({ error: 'rate_limited' }, 429, { 'retry-after': String(r.retryAfter) })
 */

const memory = new Map() // key -> { count, reset }

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN)

function memoryLimit(key, limit, windowMs) {
  const now = Date.now()
  const hit = memory.get(key)
  if (!hit || hit.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowMs })
    // purge paresseuse : on évite que la Map grossisse indéfiniment
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.reset <= now) memory.delete(k)
    }
    return { ok: true, limit, remaining: limit - 1, reset: now + windowMs, retryAfter: 0 }
  }
  hit.count += 1
  const ok = hit.count <= limit
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - hit.count),
    reset: hit.reset,
    retryAfter: ok ? 0 : Math.ceil((hit.reset - now) / 1000)
  }
}

async function redisLimit(key, limit, windowMs) {
  const k = 'rl:' + key
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify([
      ['INCR', k],
      ['PEXPIRE', k, windowMs, 'NX'],
      ['PTTL', k]
    ]),
    // un Redis lent ne doit pas bloquer une commande : 800 ms max
    signal: AbortSignal.timeout(800)
  })
  if (!res.ok) throw new Error('redis ' + res.status)
  const [incr, , pttl] = await res.json()
  const count = Number(incr?.result || 1)
  const ttl = Math.max(0, Number(pttl?.result === -1 ? windowMs : (pttl?.result ?? windowMs)))
  const ok = count <= limit
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + ttl,
    retryAfter: ok ? 0 : Math.ceil(ttl / 1000)
  }
}

export async function rateLimit({ key, limit = 30, windowMs = 60_000 }) {
  if (useRedis) {
    try {
      return await redisLimit(key, limit, windowMs)
    } catch {
      // repli silencieux : on préfère la mémoire au déni de service
      return memoryLimit(key, limit, windowMs)
    }
  }
  return memoryLimit(key, limit, windowMs)
}

/** En-têtes standard à joindre à une réponse limitée. */
export function rateLimitHeaders(r) {
  return {
    'x-ratelimit-limit': String(r.limit),
    'x-ratelimit-remaining': String(r.remaining),
    'x-ratelimit-reset': String(Math.ceil(r.reset / 1000))
  }
}

/** Réinitialise l'état mémoire (tests uniquement). */
export function __resetRateLimit() {
  memory.clear()
}
