/**
 * Requêtes réutilisables — Café Dugout (Supabase).
 *
 * Règles d'architecture (déjà appliquées par le schéma SQL) :
 *  - Lecture du menu : directe, rôle `anon` autorisé par la RLS (menu_read).
 *  - Création de commande client : JAMAIS d'INSERT direct. Le navigateur appelle
 *    POST /api/orders -> RPC `client_place_order_secure` (prix relus en base,
 *    totaux recalculés, idempotence via `client_ref`).
 *  - Actions équipe (statut, paiement) : RPC `staff_*` (security definer,
 *    contrôle du rôle dans la fonction). Aucune écriture directe sur `orders`.
 */
import { supabaseBrowser } from '@/lib/supabase/browser'

export const STATUS = ['attente', 'pret', 'servi', 'annule']
export const PAY_METHODS = ['bankily', 'masrivi', 'sedad', 'click', 'especes']

const sb = () => {
  const c = supabaseBrowser()
  if (!c) throw new Error('Supabase non configuré (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)')
  return c
}
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

/* ============================ MENU ============================ */

export const getCategories = () =>
  sb().from('categories').select('slug,label,sort_order').order('sort_order').then(unwrap)

/** category = slug ('cascroute', 'boissons'…) ou null/'Tous' pour tout le menu. */
export function getMenu({ category = null, onlyAvailable = true } = {}) {
  let q = sb()
    .from('menu_items')
    .select('id,name,description,price,image_url,is_available,category_slug,sort_order')
    .order('sort_order')
  if (onlyAvailable) q = q.eq('is_available', true)
  if (category && category !== 'Tous') q = q.eq('category_slug', category)
  return q.then(unwrap)
}

/** Admin uniquement (RLS menu_admin). Sans `id` : création ; avec `id` : mise à jour. */
export const saveDish = d =>
  sb()
    .from('menu_items')
    .upsert({
      ...(d.id ? { id: d.id } : {}),
      name: d.name,
      description: d.description || null,
      category_slug: d.category_slug,
      price: d.price,
      image_url: d.image_url || null,
      is_available: d.is_available ?? true
    })
    .select()
    .single()
    .then(unwrap)

export const setDishAvailable = (id, is_available) =>
  sb().from('menu_items').update({ is_available }).eq('id', id).then(unwrap)

export const deleteDish = id => sb().from('menu_items').delete().eq('id', id).then(unwrap)

/* ===================== COMMANDE CLIENT (QR) ===================== */

/**
 * @param {{ table?: string, qrToken?: string, items: {menu_item_id: string, qty: number, note?: string}[],
 *           note?: string, clientRef?: string }} p
 * Fournir `table` (code 'T07') OU `qrToken`, jamais les deux. Aucun prix n'est envoyé.
 * Renvoyer la même `clientRef` après une coupure réseau ne crée pas de doublon.
 */
export async function placeClientOrder({ table, qrToken, items, note, clientRef = crypto.randomUUID() }) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(qrToken ? { qr_token: qrToken } : { table }),
      items: items.map(i => ({ menu_item_id: i.menu_item_id, qty: i.qty, note: i.note || null })),
      note: note || null,
      client_ref: clientRef
    })
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(out.message || 'Commande refusée'), { code: out.error, status: res.status })
  return { orderId: out.order_id, order: out.order, clientRef }
}

/* ===================== ÉQUIPE : CUISINE / POS ===================== */

/** Commandes depuis `since` (ISO). status = filtre optionnel. Vue v_orders_full (items + paiements en JSON). */
export function listOrders({ since = new Date(Date.now() - 864e5).toISOString(), status = null } = {}) {
  let q = sb().from('v_orders_full').select('*').gte('opened_at', since).order('opened_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  return q.then(unwrap)
}

/** Cuisine / serveur / gérant / admin. status ∈ STATUS ; 'annule' clôt aussi la commande. */
export const setOrderStatus = (orderId, status) =>
  sb().rpc('staff_set_status', { p_order: orderId, p_status: status }).then(unwrap)

/** Serveur / gérant / admin. method ∈ PAY_METHODS. La commande se solde toute seule quand total payé >= sous-total. */
export const recordPayment = (orderId, amount, method, phone = null) =>
  sb().rpc('staff_record_payment', { p_order: orderId, p_amount: amount, p_method: method, p_phone: phone }).then(unwrap)

export const cancelOrder = orderId => sb().rpc('staff_cancel_order', { p_order: orderId }).then(unwrap)

/**
 * Temps réel (écran cuisine). Prérequis SQL, une seule fois :
 *   alter publication supabase_realtime add table public.orders, public.order_items;
 * Renvoie la fonction de désabonnement.
 */
export function subscribeToOrders(onChange) {
  const client = sb()
  const ch = client
    .channel('orders-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, onChange)
    .subscribe()
  return () => client.removeChannel(ch)
}
