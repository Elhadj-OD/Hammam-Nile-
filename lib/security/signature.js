/**
 * Vérification des signatures des webhooks de paiement.
 *
 * Principe : chaque opérateur (Bankily, Masrivi, Sedad, Click) signe le corps
 * de la notification avec une clé secrète partagée. On recalcule la signature
 * côté serveur et on compare en TEMPS CONSTANT (crypto.timingSafeEqual) pour
 * éviter une attaque par mesure de temps.
 *
 * ⚠️ IMPORTANT : la méthode exacte (algorithme, chaîne signée, encodage) est
 * définie par le contrat de chaque opérateur. Le tableau ci-dessous est la
 * configuration par défaut (HMAC-SHA256 sur `<timestamp>.<corps brut>`), à
 * ajuster ligne par ligne avec la documentation fournie par l'opérateur.
 * Ne JAMAIS deviner : un webhook non vérifié = paiement offert.
 *
 * Les secrets vivent dans des variables d'environnement SERVEUR uniquement :
 *   PAYMENT_SECRET_BANKILY, PAYMENT_SECRET_MASRIVI,
 *   PAYMENT_SECRET_SEDAD, PAYMENT_SECRET_CLICK
 * (aucun préfixe NEXT_PUBLIC_ : sinon la clé part dans le bundle du navigateur)
 */
import crypto from 'node:crypto'

export const PROVIDERS = {
  bankily: {
    header: 'x-bankily-signature',
    algo: 'sha256',
    encoding: 'hex',
    timestampHeader: 'x-bankily-timestamp',
    toleranceSec: 300,
    build: (ts, raw) => `${ts}.${raw}`
  },
  masrivi: {
    header: 'x-masrivi-signature',
    algo: 'sha256',
    encoding: 'hex',
    timestampHeader: 'x-masrivi-timestamp',
    toleranceSec: 300,
    build: (ts, raw) => `${ts}.${raw}`
  },
  sedad: {
    header: 'x-sedad-signature',
    algo: 'sha256',
    encoding: 'base64',
    timestampHeader: 'x-sedad-timestamp',
    toleranceSec: 300,
    build: (ts, raw) => `${ts}.${raw}`
  },
  click: {
    // Click (Click.uz) signe en MD5 sans HMAC : md5(trans_id + service_id + SECRET + merchant_trans_id + amount + action + sign_time).
    // La chaîne est reconstruite à partir du CORPS (pas d'en-tête de signature).
    header: 'x-click-signature',
    algo: 'md5',
    encoding: 'hex',
    timestampHeader: null,
    toleranceSec: 0,
    build: null // voir verifyProvider()
  }
}

/** Signature attendue pour un corps donné (utile aussi pour les tests / le back-office). */
export function computeSignature({ provider, secret, rawBody, timestamp = '' , payload = {} }) {
  const cfg = PROVIDERS[provider]
  if (!cfg) throw new Error('Opérateur inconnu')
  if (cfg.algo === 'md5') {
    const p = payload || {}
    const chain = [
      p.click_trans_id ?? '',
      p.service_id ?? '',
      secret,
      p.merchant_trans_id ?? '',
      p.amount ?? '',
      p.action ?? '',
      p.sign_time ?? ''
    ].join('')
    return crypto.createHash('md5').update(chain, 'utf8').digest('hex')
  }
  const data = cfg.build(timestamp, rawBody)
  return crypto.createHmac(cfg.algo, secret).update(data, 'utf8').digest(cfg.encoding)
}

/** Comparaison à temps constant, tolérante aux longueurs différentes. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8')
  const bb = Buffer.from(String(b), 'utf8')
  if (ba.length !== bb.length) {
    // on compare quand même pour garder un temps constant, puis on renvoie false
    crypto.timingSafeEqual(ba, ba)
    return false
  }
  return crypto.timingSafeEqual(ba, bb)
}

/**
 * Vérifie une requête webhook.
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function verifyWebhook({ provider, secret, rawBody, headers, payload, nowSec = Math.floor(Date.now() / 1000) }) {
  const cfg = PROVIDERS[provider]
  if (!cfg) return { ok: false, reason: 'provider_inconnu' }
  if (!secret || secret.length < 16) return { ok: false, reason: 'secret_absent' }

  // 1. fenêtre temporelle (anti-rejeu) — inutile pour les schémas sans horodatage
  if (cfg.timestampHeader) {
    const ts = String(headers.get(cfg.timestampHeader) || '')
    const tsNum = Number(ts)
    if (!ts || !Number.isFinite(tsNum)) return { ok: false, reason: 'timestamp_absent' }
    if (Math.abs(nowSec - tsNum) > cfg.toleranceSec) return { ok: false, reason: 'timestamp_expire' }
  }

  // 2. signature présente
  const given = headers.get(cfg.header) || ''
  if (!given) return { ok: false, reason: 'signature_absente' }

  // 3. recalcul + comparaison en temps constant
  const expected = computeSignature({
    provider,
    secret,
    rawBody,
    timestamp: cfg.timestampHeader ? String(headers.get(cfg.timestampHeader)) : '',
    payload
  })
  if (!safeEqual(given.toLowerCase(), String(expected).toLowerCase())) {
    return { ok: false, reason: 'signature_invalide' }
  }
  return { ok: true }
}
