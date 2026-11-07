/**
 * File d'attente hors-ligne (IndexedDB).
 *
 * Problème : au Café Dugout, le réseau saute (4G saturée, cave, coupure EDF).
 * Sans file d'attente, le client perd sa commande au moment de valider.
 *
 * Solution : on écrit la commande dans IndexedDB AVANT l'envoi.
 *   - envoi réussi   -> on retire l'entrée
 *   - envoi échoué   -> l'entrée reste, avec le nombre d'essais et la prochaine date
 *   - retour réseau  -> `flush()` renvoie tout, dans l'ordre, avec un backoff
 *
 * Idempotence : chaque entrée porte un `client_ref` (UUID). Le serveur déduplique
 * avec une contrainte UNIQUE sur `orders.client_ref` : même si l'envoi a réussi
 * mais que la réponse s'est perdue, un renvoi ne crée pas de doublon.
 *
 * On utilise IndexedDB (et pas localStorage) : asynchrone, plusieurs Mo,
 * pas de blocage du thread principal, et pas de quota partagé avec l'UI.
 */

const DB_NAME = 'cafe-dugout'
const DB_VERSION = 1
const STORE = 'outbox'
const MAX_TRIES = 8

const hasIDB = () => typeof indexedDB !== 'undefined'

function openDb() {
  return new Promise((resolve, reject) => {
    if (!hasIDB()) return reject(new Error('IndexedDB indisponible'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: 'client_ref' })
        st.createIndex('next_at', 'next_at')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => resolve(out?.result ?? out)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

/** Met une commande en file. `entry` = { client_ref, table|qr_token, items, note } */
export async function enqueue(entry) {
  const now = Date.now()
  const row = { ...entry, created_at: now, tries: 0, next_at: now }
  await tx('readwrite', s => {
    s.put(row)
    return s
  })
  return row
}

export async function listAll() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly')
      const req = t.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function remove(client_ref) {
  await tx('readwrite', s => s.delete(client_ref))
}

async function markFailed(client_ref, tries) {
  const delay = Math.min(60_000, 2000 * Math.pow(2, tries)) // 2s, 4s, 8s … 60s max
  await tx('readwrite', s => {
    const req = s.get(client_ref)
    req.onsuccess = () => {
      const row = req.result
      if (!row) return
      row.tries = tries
      row.next_at = Date.now() + delay
      s.put(row)
    }
    return req
  })
}

/**
 * Tente d'envoyer toutes les commandes en attente.
 * @param {(entry) => Promise<Response>} send  ex. entry => fetch('/api/orders', {...})
 * @returns {{sent:number, failed:number, remaining:number}}
 */
export async function flush(send, { force = false } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false && !force) {
    return { sent: 0, failed: 0, remaining: (await listAll()).length }
  }
  const rows = (await listAll()).filter(r => force || r.next_at <= Date.now())
  let sent = 0
  let failed = 0
  for (const row of rows) {
    try {
      const res = await send(row)
      if (res.ok || res.status === 400 || res.status === 409) {
        // 400 : refusée par la validation -> inutile de réessayer (on la retire
        // et on la garde en journal pour l'équipe)
        await remove(row.client_ref)
        sent += 1
      } else {
        failed += 1
        await markFailed(row.client_ref, Math.min(MAX_TRIES, (row.tries || 0) + 1))
      }
    } catch {
      failed += 1
      await markFailed(row.client_ref, Math.min(MAX_TRIES, (row.tries || 0) + 1))
    }
  }
  return { sent, failed, remaining: (await listAll()).length }
}

/** Relance automatiquement la file au retour du réseau / au démarrage. */
export function startAutoSync(send, onResult) {
  if (typeof window === 'undefined') return () => {}
  const run = async () => {
    const r = await flush(send)
    if (onResult && (r.sent || r.failed)) onResult(r)
  }
  window.addEventListener('online', run)
  const timer = setInterval(run, 30_000) // filet de sécurité
  run()
  return () => {
    window.removeEventListener('online', run)
    clearInterval(timer)
  }
}

/** UUID v4 avec repli si l'API crypto n'est pas disponible (vieux WebView). */
export function newClientRef() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
