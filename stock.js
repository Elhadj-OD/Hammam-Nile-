/**
 * Inventaire du magasin — requêtes réutilisables (admin + gérant).
 * Le stock n'est jamais écrit directement : il résulte des mouvements enregistrés
 * par les fonctions SQL staff_stock_move / staff_stock_count (voir supabase/6_inventory.sql).
 */
import { supabaseBrowser } from '@/lib/supabase/browser'

export const UNITS = ['unité', 'kg', 'g', 'L', 'carton', 'sac', 'paquet', 'boîte', 'plaquette']
export const REASONS = ['Utilisé', 'Perte', 'Casse']

const sb = () => {
  const c = supabaseBrowser()
  if (!c) throw new Error('Supabase non configuré')
  return c
}
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

/** Stock actuel de tous les articles actifs (vue v_stock). */
export const listStock = () => sb().from('v_stock').select('*').eq('is_active', true).order('name').then(unwrap)

/** Derniers mouvements. kind = 'entree' | 'sortie' | 'ajustement' | null (tous). */
export function listMovements({ kind = null, location = null, limit = 200 } = {}) {
  let q = sb()
    .from('stock_movements')
    .select('id,kind,location,qty,unit_cost,party,note,by_name,moved_at,stock_items(name,unit)')
    .order('moved_at', { ascending: false })
    .limit(limit)
  if (kind) q = q.eq('kind', kind)
  if (location) q = q.eq('location', location)
  return q.then(unwrap)
}

export const addStockItem = ({ name, unit, category, minQty, minCuisine }) =>
  sb()
    .from('stock_items')
    .insert({ name: name.trim(), unit, category: category?.trim() || null, min_qty: Number(minQty) || 0, min_cuisine: Number(minCuisine) || 0 })
    .then(unwrap)

export const updateStockItem = (id, patch) => sb().from('stock_items').update(patch).eq('id', id).then(unwrap)
export const archiveStockItem = id => updateStockItem(id, { is_active: false })

/** Entrée au magasin (achat / réception). Renvoie le nouveau stock. */
export const stockIn = ({ item, qty, unitCost, supplier, note }) =>
  sb()
    .rpc('staff_stock_move', {
      p_item: item,
      p_kind: 'entree',
      p_qty: qty,
      p_unit_cost: unitCost === '' || unitCost == null ? null : Number(unitCost),
      p_party: supplier || null,
      p_note: note || null
    })
    .then(unwrap)

/** Envoi du MAGASIN vers la CUISINE : retire du stock magasin et ajoute au stock cuisine (une seule opération). */
export const stockOut = ({ item, qty, note }) =>
  sb().rpc('staff_stock_move', { p_item: item, p_kind: 'sortie', p_qty: qty, p_note: note || null }).then(unwrap)

/** Cuisine : déclare une consommation (reason = 'Utilisé' | 'Perte' | 'Casse'). Refusé si le stock cuisine est insuffisant. */
export const stockUse = ({ item, qty, reason, note }) =>
  sb().rpc('staff_kitchen_use', { p_item: item, p_qty: qty, p_reason: reason || 'Utilisé', p_note: note || null }).then(unwrap)

/** Comptage physique : fixe le stock du lieu ('magasin' ou 'cuisine') à `counted`. */
export const stockCount = ({ item, counted, note, location = 'magasin' }) =>
  sb().rpc('staff_stock_count', { p_item: item, p_counted: counted, p_note: note || null, p_location: location }).then(unwrap)
