'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { can } from '@/lib/config'
import { mapDish, mapExpense, mapOrder } from '@/lib/orders'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { toast } from '@/lib/toast'

const PosCtx = createContext(null)

/** Contexte partagé par tous les onglets : données + actions (toutes les actions
 *  repassent par les fonctions SQL sécurisées, jamais par une écriture directe). */
export function usePos() {
  const ctx = useContext(PosCtx)
  if (!ctx) throw new Error('usePos doit être utilisé dans <PosProvider>')
  return ctx
}

export default function PosProvider({ staff, children }) {
  const sb = supabaseBrowser()
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [tables, setTables] = useState([])   // liste publique (code + libellé)
  const [qrTables, setQrTables] = useState([]) // resto_tables + qr_token (équipe connectée)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const lastNewest = useRef(0)
  const audioCtx = useRef(null)
  const soundOn = useRef(true)

  const isAdmin = can(staff?.role, 'a')

  const beep = useCallback(() => {
    if (!soundOn.current) return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      audioCtx.current = audioCtx.current || new AC()
      const ac = audioCtx.current
      ac.resume()
      ;[880, 1175].forEach((f, i) => {
        const o = ac.createOscillator()
        const g = ac.createGain()
        const t = ac.currentTime + i * 0.18
        o.frequency.value = f
        o.connect(g)
        g.connect(ac.destination)
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        o.start(t)
        o.stop(t + 0.32)
      })
    } catch {
      /* audio indisponible */
    }
  }, [])

  /** Recharge uniquement les commandes (léger) : appelée dès que l'empreinte serveur change. */
  const loadOrders = useCallback(async () => {
    if (!sb) return
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const o = await sb.from('v_orders_full').select('*').gte('opened_at', since).order('opened_at', { ascending: false }).limit(500)
    if (o.error) return setError(o.error.message)
    setError(null)
    setOrders(o.data.map(mapOrder))
    const newest = Math.max(0, ...o.data.filter(x => !x.closed_at).map(x => new Date(x.opened_at).getTime()))
    if (lastNewest.current && newest > lastNewest.current) beep()
    if (newest > lastNewest.current) lastNewest.current = newest
  }, [sb, beep])

  const load = useCallback(async () => {
    if (!sb) return
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const [o, m, tb, e, rt] = await Promise.all([
      sb.from('v_orders_full').select('*').gte('opened_at', since).order('opened_at', { ascending: false }).limit(500),
      sb.from('menu_items').select('*').order('sort_order'),
      sb.from('v_tables_public').select('code,label').order('code'),
      isAdmin
        ? sb.from('expenses').select('id,label,amount,spent_at').order('spent_at', { ascending: false }).limit(200)
        : Promise.resolve({ data: [] }),
      sb.from('resto_tables').select('code,label,seats,qr_token,is_active').order('code')
    ])

    const firstError = o.error || m.error || rt.error
    setError(firstError ? firstError.message : null)

    if (o.data) {
      const mapped = o.data.map(mapOrder)
      setOrders(mapped)
      const newest = Math.max(0, ...o.data.filter(x => !x.closed_at).map(x => new Date(x.opened_at).getTime()))
      if (lastNewest.current && newest > lastNewest.current) beep()
      if (newest > lastNewest.current) lastNewest.current = newest
    }
    if (m.data) setMenu(m.data.map(mapDish))
    const cr = await sb.from('categories').select('slug,label,icon_url,sort_order').order('sort_order')
    if (cr.data) setCategories(cr.data)
    if (tb.data) setTables(tb.data.map(t => ({ code: t.code, label: t.label })))
    if (e?.data) setExpenses(e.data.map(mapExpense))
    if (rt.data) setQrTables(rt.data)
    setLoading(false)
  }, [sb, isAdmin, beep])

  // Actualisation toutes les 2 s : on interroge une petite empreinte (orders_signature) et on ne recharge
  // les commandes que si elle change. Menu, tables, dépenses : toutes les 30 s.
  // Si la fonction SQL 10_actualisation.sql n'est pas installée : secours, rechargement toutes les ~6 s.
  const sigRef = useRef('')
  useEffect(() => {
    if (!sb) return
    load()
    let stop = false
    let busy = false
    let n = 0
    const tick = async () => {
      if (stop || busy) return
      busy = true
      try {
        n++
        const { data, error: e } = await sb.rpc('orders_signature')
        if (e) {
          if (n % 3 === 0) await loadOrders()
        } else if (data !== sigRef.current) {
          sigRef.current = data
          await loadOrders()
        }
        if (n % 15 === 0) await load()
      } catch {
        /* réseau coupé : on réessaie au prochain tour */
      } finally {
        busy = false
      }
    }
    const id = setInterval(tick, 2000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [sb, load, loadOrders])

  /* ---------------- actions ---------------- */
  const act = useCallback(
    async (label, fn) => {
      if (!sb) return
      const { error: err } = (await fn()) || {}
      if (err) {
        toast(err.message, 'error')
        return false
      }
      await load()
      if (label) toast(label)
      return true
    },
    [sb, load]
  )

  const api = useMemo(
    () => ({
      staff,
      isAdmin,
      orders,
      menu,
      categories,
      expenses,
      tables,
      qrTables,
      loading,
      error,
      refresh: load,
      beep,

      /** Prise de commande par l'équipe (serveur, gérant, admin). lines = [{ id, qty, note? }] */
      placeOrder: (tableCode, lines, note) =>
        act('Commande enregistrée', () =>
          sb.rpc('staff_place_order', {
            p_table_code: tableCode,
            p_items: lines.map(l => ({ menu_item_id: l.id, qty: l.qty, note: l.note || null })),
            p_note: note || null
          })
        ),

      setStatus: (order, nextLabel) =>
        act('Statut mis à jour', () =>
          sb.rpc('staff_set_status', { p_order: order, p_status: { Attente: 'attente', Prêt: 'pret', Servi: 'servi' }[nextLabel] })
        ),

      pay: (orderId, amount, method, phone) =>
        act('Paiement enregistré', () =>
          sb.rpc('staff_record_payment', {
            p_order: orderId,
            p_amount: Number(amount),
            p_method: method,
            p_phone: phone || null
          })
        ),

      removeOrder: (id) =>
        act('Commande supprimée', async () => {
          const { error: e1 } = await sb.rpc('staff_delete_order', { p_order: id })
          if (!e1) return { error: null }
          return sb.rpc('staff_cancel_order', { p_order: id })
        }),

      moveOrder: (id, tableCode) =>
        act('Table modifiée', () => sb.rpc('staff_move_order', { p_order: id, p_table_code: tableCode })),

      purge: async (before) => {
        const { data, error: err } = await sb.rpc('staff_purge_history', {
          p_before: before || new Date().toISOString()
        })
        if (err) return toast(err.message, 'error')
        await load()
        toast((data || 0) + ' commande(s) purgée(s)')
      },

      saveDish: async (dish, id) => {
        let img = dish.img || ''
        try {
          if (img.startsWith('data:')) img = await uploadPhoto(sb, img)
        } catch (e) {
          return toast('Photo refusée : ' + e.message, 'error')
        }
        const row = {
          name: dish.name,
          description: dish.desc || null,
          category_slug: dish.cat,
          price: Number(dish.price),
          image_url: img || null
        }
        await act('Plat enregistré', () =>
          id ? sb.from('menu_items').update(row).eq('id', id) : sb.from('menu_items').insert(row)
        )
      },

      /** dataUrl = image carrée (PNG) ; '' ou null = rétablir l'icône par défaut. */
      saveCategoryIcon: async (slug, dataUrl) => {
        let url = null
        try {
          if (dataUrl) url = await uploadPhoto(sb, dataUrl, 'icones')
        } catch (e) {
          return toast('Icône refusée : ' + e.message, 'error')
        }
        await act('Icône enregistrée', () => sb.from('categories').update({ icon_url: url }).eq('slug', slug))
      },

      toggleDish: (dish) =>
        act(null, () => sb.from('menu_items').update({ is_available: !dish.on }).eq('id', dish.id)),

      deleteDish: (id) => act('Plat supprimé', () => sb.from('menu_items').delete().eq('id', id)),

      addExpense: (label, amount) =>
        act('Dépense ajoutée', () => sb.from('expenses').insert({ label, amount: Number(amount) })),

      deleteExpense: (id) => act(null, () => sb.from('expenses').delete().eq('id', id))
    }),
    [staff, isAdmin, orders, menu, categories, expenses, tables, qrTables, loading, error, load, act, sb, beep]
  )

  return <PosCtx.Provider value={api}>{children}</PosCtx.Provider>
}

/** Compresse la photo (640 px max) puis l'envoie dans le bucket Storage « menu ». */
async function uploadPhoto(sb, dataUrl, folder = 'plats') {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const path = `${folder}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const { error } = await sb.storage
    .from('menu')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '3600', upsert: false })
  if (error) throw error
  return sb.storage.from('menu').getPublicUrl(path).data.publicUrl
}
