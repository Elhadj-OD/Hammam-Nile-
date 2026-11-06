/**
 * Faux Supabase (auth + PostgREST minimal + RPC) pour tester l'app Next.js en local.
 * Usage : node mock/supabase-mock.mjs  (écoute sur http://127.0.0.1:54321)
 * NE PAS UTILISER EN PRODUCTION — c'est uniquement un banc de test.
 */
import http from 'node:http'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

const PORT = 54321
const seed = JSON.parse(fs.readFileSync(new URL('../qr/tables.json', 'file://' + process.cwd() + '/'), 'utf8'))
const TOKENS = seed.tables

const staff = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'admin@dugout.mr', password: 'dugout2025', full_name: 'Mohamed (Admin)', role: 'admin', is_active: true },
  { id: '22222222-2222-4222-8222-222222222222', email: 'serveur@dugout.mr', password: 'dugout2025', full_name: 'Fatima (Serveur)', role: 'serveur', is_active: true }
]

const resto_tables = TOKENS.map((t, i) => ({
  id: `00000000-0000-4000-8000-0000000000${String(i + 1).padStart(2, '0')}`,
  code: t.code,
  label: t.label,
  seats: t.seats,
  qr_token: t.token,
  is_active: true
}))

const menu = [
  ['Petit déj Dugout', 'petit-dejeuner', 120, 'Omelette, pain chaud, fromage et café au choix'],
  ['Omelette & pain', 'petit-dejeuner', 70, 'Deux œufs, tomate et pain frais'],
  ['Foul & pain', 'petit-dejeuner', 50, 'Fèves mijotées, huile d’olive et pain chaud'],
  ['Cascroute poulet', 'cascroute', 90, 'Poulet grillé, crudités et sauce maison'],
  ['Cascroute viande', 'cascroute', 100, 'Viande hachée, oignons et frites dans le pain'],
  ['Cascroute thon', 'cascroute', 80, 'Thon, olives, œuf et salade'],
  ['Burger Dugout', 'snack', 150, 'Steak, fromage fondu, salade et sauce maison'],
  ['Chawarma poulet', 'snack', 120, 'Poulet mariné, crudités et sauce à l’ail'],
  ['Frites maison', 'snack', 50, 'Pommes de terre fraîches, bien croustillantes'],
  ['Gâteau du jour', 'sucre', 60, 'Part de gâteau préparée chaque matin'],
  ['Crêpe chocolat', 'sucre', 70, 'Crêpe tiède nappée de chocolat'],
  ['Beignets sucrés', 'sucre', 40, 'Six beignets dorés, sucre glace'],
  ['Café noir', 'boissons', 30, 'Espresso serré'],
  ['Café au lait', 'boissons', 40, 'Café onctueux au lait chaud'],
  ['Thé à la menthe', 'boissons', 25, 'Préparé à la mauritanienne, trois services'],
  ['Jus de Bissap', 'boissons', 50, 'Hibiscus glacé, frais et désaltérant'],
  ['Jus de Bouye', 'boissons', 60, 'Pain de singe onctueux, servi bien frais']
].map(([name, cat, price, description], i) => ({
  id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
  name,
  category_slug: cat,
  price,
  description,
  image_url: null,
  is_available: true,
  sort_order: i
}))

const orders = []
const order_items = []
const payments = []
// --- durcissement sécurité (migration 4) : tables simulées ---
const payment_intents = []
const webhook_events = new Map() // `${provider}:${event_id}` -> event
const rate_limits = new Map() // `key` -> { hits, start }
const expenses = [{ id: randomUUID(), label: 'Charbon', amount: 300, spent_at: new Date().toISOString(), created_by: staff[0].id }]

const now = Date.now()
function seedOrder(code, items, minutesAgo, status = 'attente') {
  const t = resto_tables.find(x => x.code === code)
  const o = {
    id: randomUUID(),
    order_no: orders.length + 1,
    table_id: t.id,
    status,
    channel: 'client',
    subtotal: 0,
    opened_at: new Date(now - minutesAgo * 60000).toISOString(),
    closed_at: null
  }
  orders.push(o)
  items.forEach(([mi, qty, note]) => {
    const m = menu[mi]
    order_items.push({
      id: randomUUID(),
      order_id: o.id,
      menu_item_id: m.id,
      name_snapshot: m.name,
      unit_price: m.price,
      qty,
      note: note || null,
      line_total: m.price * qty
    })
  })
  o.subtotal = order_items.filter(i => i.order_id === o.id).reduce((a, i) => a + i.line_total, 0)
  return o
}

const o1 = seedOrder('T03', [[0, 2, 'sans piment'], [4, 2, null]], 24, 'attente')
const o2 = seedOrder('T07', [[2, 1, null], [6, 1, null]], 8, 'pret')
// une commande déjà soldée ce matin
const o3 = seedOrder('T11', [[1, 1, null], [5, 1, null]], 190, 'servi')
o3.closed_at = new Date(now - 150 * 60000).toISOString()
payments.push({ id: randomUUID(), order_id: o3.id, amount: o3.subtotal, method: 'bankily', phone: '22222222', received_by: staff[0].id, paid_at: new Date(now - 150 * 60000).toISOString() })

const full = o => {
  const items = order_items.filter(i => i.order_id === o.id)
  const pays = payments.filter(p => p.order_id === o.id)
  const t = resto_tables.find(x => x.id === o.table_id)
  return {
    id: o.id,
    order_no: o.order_no,
    status: o.status,
    channel: o.channel,
    subtotal: o.subtotal,
    opened_at: o.opened_at,
    closed_at: o.closed_at,
    table_code: t?.code,
    table_label: t?.label,
    items: items.map(i => ({ id: i.id, menu_item_id: i.menu_item_id, name: i.name_snapshot, price: i.unit_price, qty: i.qty, note: i.note })),
    paid: pays.reduce((a, p) => a + Number(p.amount), 0),
    pays: pays.map(p => ({ amt: p.amount, op: p.method, ph: p.phone, t: p.paid_at }))
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Range'
}

const json = (res, code, body, extra = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...CORS, ...extra })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

const userFromAuth = req => {
  const h = req.headers.authorization || ''
  const token = h.replace(/^Bearer\s+/i, '')
  const id = token.replace(/^token-/, '')
  return staff.find(s => s.id === id) || null
}
const authUser = s => ({
  id: s.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: s.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: s.full_name },
  created_at: new Date().toISOString()
})

function applyFilters(rows, url) {
  let out = [...rows]
  for (const [k, v] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'apikey', 'columns', 'on_conflict'].includes(k)) continue
    const [op, ...rest] = v.split('.')
    const val = rest.join('.')
    if (op === 'eq') out = out.filter(r => String(r[k]) === val)
    else if (op === 'gte') out = out.filter(r => r[k] >= val)
    else if (op === 'lte') out = out.filter(r => r[k] <= val)
    else if (op === 'neq') out = out.filter(r => String(r[k]) !== val)
    else if (op === 'is') out = out.filter(r => String(r[k]) === val)
  }
  const order = url.searchParams.get('order')
  if (order) {
    const [col, dir] = order.split('.')
    out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1))
  }
  const limit = Number(url.searchParams.get('limit') || 0)
  return limit ? out.slice(0, limit) : out
}

const pick = (row, select) => {
  if (!select || select === '*') return row
  const cols = select.split(',').map(s => s.trim())
  const o = {}
  cols.forEach(c => {
    if (c in row) o[c] = row[c]
  })
  return o
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (req.method === 'OPTIONS') return json(res, 204, undefined)

  let body = ''
  for await (const chunk of req) body += chunk
  const payload = body ? JSON.parse(body) : {}

  /* ---------- AUTH ---------- */
  if (url.pathname === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type')
    if (grant === 'password') {
      const s = staff.find(x => x.email === payload.email && x.password === payload.password)
      if (!s) return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' })
      return json(res, 200, {
        access_token: 'token-' + s.id,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-' + s.id,
        user: authUser(s)
      })
    }
    if (grant === 'refresh_token') {
      const id = String(payload.refresh_token || '').replace('refresh-', '')
      const s = staff.find(x => x.id === id)
      if (!s) return json(res, 400, { message: 'Invalid Refresh Token' })
      return json(res, 200, {
        access_token: 'token-' + s.id,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-' + s.id,
        user: authUser(s)
      })
    }
  }
  if (url.pathname === '/auth/v1/user') {
    const s = userFromAuth(req)
    if (!s) return json(res, 401, { message: 'invalid claim: missing sub claim' })
    return json(res, 200, authUser(s))
  }
  if (url.pathname === '/auth/v1/logout') return json(res, 204)

  /* ---------- RPC ---------- */
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const fn = url.pathname.split('/').pop()
    const s = userFromAuth(req)
    const token = payload.p_token
    const byCode = () =>
      resto_tables.find(t => t.code === String(payload.p_code || '').toUpperCase() && t.is_active)
    const table = token ? resto_tables.find(t => t.qr_token === token) : null
    const need = () => {
      if (!s) throw new Error('Non autorisé')
      return s
    }
    try {
      if (fn === 'client_table_info') {
        if (!table) return json(res, 200, null)
        return json(res, 200, { code: table.code, label: table.label, seats: table.seats })
      }
      if (fn === 'client_open_order') {
        if (!table) return json(res, 400, { message: 'QR invalide' })
        const o = orders.find(x => x.table_id === table.id && !x.closed_at && x.status !== 'annule')
        return json(res, 200, o ? full(o) : null)
      }
      if (fn === 'client_open_order_by_table') {
        const tb = byCode()
        if (!tb) return json(res, 400, { message: 'Table inconnue' })
        const o = orders.find(x => x.table_id === tb.id && !x.closed_at && x.status !== 'annule')
        return json(res, 200, o ? full(o) : null)
      }
      if (fn === 'client_place_order_by_table') {
        const tb = byCode()
        if (!tb) return json(res, 400, { message: 'Table inconnue ou fermée' })
        let o = orders.find(x => x.table_id === tb.id && !x.closed_at && x.status !== 'annule')
        if (!o) {
          o = { id: randomUUID(), order_no: orders.length + 1, table_id: tb.id, status: 'attente', channel: 'client', subtotal: 0, opened_at: new Date().toISOString(), closed_at: null }
          orders.push(o)
        }
        for (const it of payload.p_items || []) {
          const m = menu.find(x => x.id === it.menu_item_id)
          if (!m) return json(res, 400, { message: 'Produit introuvable' })
          const ex = order_items.find(i => i.order_id === o.id && i.menu_item_id === m.id && (i.note || '') === (it.note || ''))
          if (ex) {
            ex.qty += it.qty
            ex.line_total = ex.unit_price * ex.qty
          } else {
            order_items.push({ id: randomUUID(), order_id: o.id, menu_item_id: m.id, name_snapshot: m.name, unit_price: m.price, qty: it.qty, note: it.note || null, line_total: m.price * it.qty })
          }
        }
        o.subtotal = order_items.filter(i => i.order_id === o.id).reduce((a, i) => a + i.line_total, 0)
        return json(res, 200, { order_id: o.id, order: full(o) })
      }
      if (fn === 'client_place_order') {
        if (!table) return json(res, 400, { message: 'QR invalide' })
        let o = orders.find(x => x.table_id === table.id && !x.closed_at && x.status !== 'annule')
        if (!o) {
          o = { id: randomUUID(), order_no: orders.length + 1, table_id: table.id, status: 'attente', channel: 'client', subtotal: 0, opened_at: new Date().toISOString(), closed_at: null }
          orders.push(o)
        }
        for (const it of payload.p_items || []) {
          const m = menu.find(x => x.id === it.menu_item_id)
          if (!m) return json(res, 400, { message: 'Produit introuvable' })
          const ex = order_items.find(i => i.order_id === o.id && i.menu_item_id === m.id && (i.note || '') === (it.note || ''))
          if (ex) {
            ex.qty += it.qty
            ex.line_total = ex.unit_price * ex.qty
          } else {
            order_items.push({ id: randomUUID(), order_id: o.id, menu_item_id: m.id, name_snapshot: m.name, unit_price: m.price, qty: it.qty, note: it.note || null, line_total: m.price * it.qty })
          }
        }
        o.subtotal = order_items.filter(i => i.order_id === o.id).reduce((a, i) => a + i.line_total, 0)
        return json(res, 200, { order_id: o.id, order: full(o) })
      }

      /* ---- client_place_order_secure (point d'entrée durci) ---- */
      if (fn === 'client_place_order_secure') {
        // 1. idempotence : même client_ref => même commande
        if (payload.p_client_ref) {
          const already = orders.find(o => o.client_ref === payload.p_client_ref)
          if (already) return json(res, 200, { order_id: already.id, order: full(already), duplicate: true })
        }
        // 2. résolution de la table (jeton QR prioritaire, sinon code)
        let tb = null
        if (payload.p_token) tb = resto_tables.find(t => t.qr_token === payload.p_token && t.is_active)
        else if (payload.p_code) tb = resto_tables.find(t => t.code === String(payload.p_code).toUpperCase() && t.is_active)
        if (!tb) return json(res, 400, { message: 'Table inconnue ou fermée' })
        // 3. débit par table : 10/minute
        const rk = 'order:' + tb.code
        const now = Date.now()
        const rl = rate_limits.get(rk)
        if (!rl || now - rl.start > 60000) rate_limits.set(rk, { hits: 1, start: now })
        else {
          rl.hits += 1
          if (rl.hits > 10) return json(res, 400, { message: 'Trop de commandes envoyées. Patientez une minute.' })
        }
        // 4. forme des articles
        const items = Array.isArray(payload.p_items) ? payload.p_items : []
        if (!items.length) return json(res, 400, { message: 'Panier vide' })
        if (items.length > 30) return json(res, 400, { message: 'Trop d’articles (30 max)' })
        for (const it of items) {
          if (!/^[0-9a-f-]{36}$/i.test(String(it.menu_item_id || ''))) return json(res, 400, { message: 'Article invalide' })
          const q = Number(it.qty)
          if (!Number.isInteger(q) || q < 1 || q > 20) return json(res, 400, { message: 'Quantité invalide (1 à 20)' })
        }
        // 5. création (prix relus dans menu, jamais dans le payload)
        let o = orders.find(x => x.table_id === tb.id && !x.closed_at && x.status !== 'annule')
        if (!o) {
          o = { id: randomUUID(), order_no: orders.length + 1, table_id: tb.id, status: 'attente', channel: 'client', subtotal: 0, opened_at: new Date().toISOString(), closed_at: null, client_ref: null }
          orders.push(o)
        }
        if (payload.p_client_ref && !o.client_ref) o.client_ref = payload.p_client_ref
        for (const it of items) {
          const m = menu.find(x => x.id === it.menu_item_id)
          if (!m) return json(res, 400, { message: 'Produit introuvable' })
          if (m.is_available === false) return json(res, 400, { message: 'Produit indisponible: ' + m.name })
          const ex = order_items.find(i => i.order_id === o.id && i.menu_item_id === m.id && (i.note || '') === (it.note || ''))
          if (ex) {
            ex.qty += it.qty
            ex.line_total = ex.unit_price * ex.qty
          } else {
            order_items.push({ id: randomUUID(), order_id: o.id, menu_item_id: m.id, name_snapshot: m.name, unit_price: m.price, qty: it.qty, note: it.note || null, line_total: m.price * it.qty })
          }
        }
        o.subtotal = order_items.filter(i => i.order_id === o.id).reduce((a, i) => a + i.line_total, 0)
        return json(res, 200, { order_id: o.id, order: full(o), duplicate: false })
      }

      /* ---- staff_create_payment_intent ---- */
      if (fn === 'staff_create_payment_intent') {
        need()
        const o = orders.find(x => x.id === payload.p_order)
        if (!o) return json(res, 400, { message: 'Commande inconnue' })
        const paid = payments.filter(p => p.order_id === o.id).reduce((a, p) => a + Number(p.amount), 0)
        const left = Math.round((o.subtotal - paid) * 100) / 100
        if (left <= 0) return json(res, 400, { message: 'Commande déjà payée' })
        const amount = Math.round(Number(payload.p_amount ?? left) * 100) / 100
        if (amount <= 0 || amount > left + 0.01) return json(res, 400, { message: 'Montant invalide' })
        const reference = payload.p_reference || 'CC-' + o.id.slice(0, 8).toUpperCase()
        const intent = { id: randomUUID(), order_id: o.id, provider: payload.p_provider, amount, reference, status: 'pending' }
        payment_intents.push(intent)
        return json(res, 200, intent)
      }

      /* ---- webhook_apply_payment (service_role uniquement en vrai) ---- */
      if (fn === 'webhook_apply_payment') {
        const key = payload.p_provider + ':' + payload.p_event_id
        if (webhook_events.has(key)) return json(res, 200, { duplicate: true, result: 'already_processed' })
        webhook_events.set(key, { ...payload, at: new Date().toISOString() })
        const intent = payment_intents.find(i => i.provider === payload.p_provider && i.reference === payload.p_reference)
        if (!intent) return json(res, 200, { duplicate: false, result: 'no_intent' })
        if (payload.p_status !== 'paid') { intent.status = payload.p_status; return json(res, 200, { duplicate: false, result: payload.p_status }) }
        if (Math.abs(Number(payload.p_amount) - intent.amount) > 0.01) {
          intent.status = 'failed'
          return json(res, 200, { duplicate: false, result: 'amount_mismatch' })
        }
        const o = orders.find(x => x.id === intent.order_id)
        const paid = payments.filter(p => p.order_id === o.id).reduce((a, p) => a + Number(p.amount), 0)
        const left = Math.round((o.subtotal - paid) * 100) / 100
        if (left <= 0) { intent.status = 'paid'; return json(res, 200, { duplicate: false, result: 'nothing_left' }) }
        const take = Math.min(intent.amount, left)
        payments.push({ id: randomUUID(), order_id: o.id, amount: take, method: payload.p_provider, phone: null, received_by: null, paid_at: new Date().toISOString() })
        intent.status = 'paid'
        return json(res, 200, { duplicate: false, result: 'paid', order_id: o.id, amount: take, provider: payload.p_provider })
      }

      if (fn === 'staff_set_status') {
        need()
        const o = orders.find(x => x.id === payload.p_order)
        if (!o) return json(res, 400, { message: 'Commande inconnue' })
        o.status = payload.p_status
        if (payload.p_status === 'annule') o.closed_at = new Date().toISOString()
        return json(res, 200, null)
      }
      if (fn === 'staff_record_payment') {
        const u = need()
        const o = orders.find(x => x.id === payload.p_order)
        if (!o) return json(res, 400, { message: 'Commande inconnue' })
        const paid = payments.filter(p => p.order_id === o.id).reduce((a, p) => a + Number(p.amount), 0)
        const left = o.subtotal - paid
        if (payload.p_amount > left + 0.01) return json(res, 400, { message: `Montant supérieur au reste à payer (${left.toFixed(2)} MRU)` })
        payments.push({ id: randomUUID(), order_id: o.id, amount: payload.p_amount, method: payload.p_method, phone: payload.p_phone, received_by: u.id, paid_at: new Date().toISOString() })
        if (paid + payload.p_amount >= o.subtotal) o.closed_at = new Date().toISOString()
        return json(res, 200, { paid: paid + payload.p_amount, left: Math.max(0, left - payload.p_amount) })
      }
      if (fn === 'staff_move_order') {
        need()
        const o = orders.find(x => x.id === payload.p_order)
        const t = resto_tables.find(x => x.code === String(payload.p_table_code).toUpperCase())
        if (!t) return json(res, 400, { message: 'Table inconnue' })
        const busy = orders.find(x => x.table_id === t.id && !x.closed_at && x.id !== o.id)
        if (busy) return json(res, 400, { message: `La table ${t.label} a déjà une commande en cours` })
        o.table_id = t.id
        return json(res, 200, null)
      }
      if (fn === 'staff_delete_order' || fn === 'staff_cancel_order') {
        need()
        const i = orders.findIndex(x => x.id === payload.p_order)
        if (i >= 0) {
          if (fn === 'staff_delete_order') {
            orders.splice(i, 1)
            for (let k = order_items.length - 1; k >= 0; k--) if (order_items[k].order_id === payload.p_order) order_items.splice(k, 1)
          } else {
            orders[i].status = 'annule'
            orders[i].closed_at = new Date().toISOString()
          }
        }
        return json(res, 200, null)
      }
      if (fn === 'staff_purge_history') {
        need()
        let n = 0
        for (let i = orders.length - 1; i >= 0; i--) {
          if (orders[i].closed_at) {
            orders.splice(i, 1)
            n++
          }
        }
        return json(res, 200, n)
      }
      return json(res, 404, { message: 'RPC inconnue: ' + fn })
    } catch (e) {
      return json(res, 401, { message: e.message })
    }
  }

  /* ---------- REST ---------- */
  if (url.pathname.startsWith('/rest/v1/')) {
    const name = url.pathname.replace('/rest/v1/', '')
    const select = url.searchParams.get('select') || '*'
    const single = (req.headers.accept || '').includes('object+json')

    if (name === 'staff') {
      const s = userFromAuth(req)
      const rows = s ? [s].map(x => ({ full_name: x.full_name, role: x.role, is_active: x.is_active, id: x.id, email: x.email })) : []
      const out = applyFilters(rows, url).map(r => pick(r, select))
      return single ? json(res, out.length ? 200 : 406, out[0] || { message: 'no rows' }) : json(res, 200, out)
    }
    if (name === 'menu_items') {
      if (req.method === 'GET') {
        const out = applyFilters(menu, url).map(r => pick(r, select))
        return single ? json(res, 200, out[0] || null) : json(res, 200, out)
      }
      if (req.method === 'POST') {
        const row = { id: randomUUID(), is_available: true, sort_order: menu.length, ...payload }
        menu.push(row)
        return json(res, 201, [row])
      }
      if (req.method === 'PATCH') {
        const ids = (url.searchParams.get('id') || '').replace('eq.', '')
        const row = menu.find(m => m.id === ids)
        if (row) Object.assign(row, payload)
        return json(res, 200, row ? [row] : [])
      }
      if (req.method === 'DELETE') {
        const ids = (url.searchParams.get('id') || '').replace('eq.', '')
        const i = menu.findIndex(m => m.id === ids)
        if (i >= 0) menu.splice(i, 1)
        return json(res, 200, [])
      }
    }
    if (name === 'v_tables_public') {
      const rows = resto_tables.map(t => ({ code: t.code, label: t.label, seats: t.seats }))
      return json(res, 200, applyFilters(rows, url))
    }
    if (name === 'resto_tables') {
      if (!userFromAuth(req)) return json(res, 401, { message: 'permission denied for table resto_tables' })
      return json(res, 200, applyFilters(resto_tables, url).map(r => pick(r, select)))
    }
    if (name === 'v_orders_full') {
      if (!userFromAuth(req)) return json(res, 401, { message: 'permission denied for table orders' })
      const rows = orders.map(full)
      const out = applyFilters(rows, url)
      return json(res, 200, out)
    }
    if (name === 'expenses') {
      const s = userFromAuth(req)
      if (!s) return json(res, 401, { message: 'permission denied for table expenses' })
      if (req.method === 'GET') return json(res, 200, applyFilters(expenses, url).map(r => pick(r, select)))
      if (req.method === 'POST') {
        const row = { id: randomUUID(), spent_at: new Date().toISOString(), created_by: s.id, ...payload }
        expenses.push(row)
        return json(res, 201, [row])
      }
      if (req.method === 'DELETE') {
        const ids = (url.searchParams.get('id') || '').replace('eq.', '')
        const i = expenses.findIndex(e => e.id === ids)
        if (i >= 0) expenses.splice(i, 1)
        return json(res, 200, [])
      }
    }
    return json(res, 404, { message: 'table inconnue: ' + name })
  }

  json(res, 404, { message: 'not found' })
})

server.listen(PORT, '0.0.0.0', () => console.log('mock supabase → http://127.0.0.1:' + PORT))
