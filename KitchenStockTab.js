'use client'

import { useCallback, useEffect, useState } from 'react'
import { can, dt } from '@/lib/config'
import { toast } from '@/lib/toast'
import { REASONS, listMovements, listStock, stockCount, stockUse, updateStockItem } from '@/lib/api/stock'
import { usePos } from './PosProvider'

const num = v => Number(String(v).replace(',', '.'))
const fq = n => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })

/**
 * Stock CUISINE : le petit stock de travail. Il se remplit par les envois du magasin
 * (onglet Stock Magasin) et diminue quand la cuisine déclare Utilisé / Perte / Casse.
 * Accessible à la cuisine, au gérant et à l'admin. La cuisine ne voit jamais le stock du magasin.
 */
export default function KitchenStockTab() {
  const { staff } = usePos()
  const manager = can(staff?.role, 'm')
  const [view, setView] = useState('stock')
  const [items, setItems] = useState([])
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // { item, qty, reason, note }

  const load = useCallback(async quiet => {
    try {
      const [s, m] = await Promise.all([listStock(), listMovements({ location: 'cuisine', limit: 200 })])
      setItems(s || [])
      setMoves(m || [])
    } catch (e) {
      if (!quiet) toast('Stock cuisine : ' + e.message, 'error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 5000) // actualisation automatique, sans message d'erreur répété
    return () => clearInterval(id)
  }, [load])

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      await fn()
      toast(okMsg)
      await load()
      return true
    } catch (e) {
      toast(e.message || 'Opération refusée', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitUse = async () => {
    const qty = num(form.qty)
    if (!(qty > 0)) return toast('Saisissez une quantité', 'error')
    const it = items.find(i => i.id === form.item)
    if (it && qty > Number(it.qty_cuisine)) return toast('Stock cuisine insuffisant : ' + fq(it.qty_cuisine) + ' ' + it.unit + ' disponible', 'error')
    const ok = await run(() => stockUse({ item: form.item, qty, reason: form.reason, note: form.note }), form.reason + ' enregistré')
    if (ok) setForm(null)
  }

  const count = it => {
    const v = window.prompt(`Quantité réellement comptée en cuisine pour « ${it.name} » (${it.unit}) ?`, fq(it.qty_cuisine).replace(/\s/g, ''))
    if (v === null) return
    const n = num(v)
    if (!(n >= 0)) return toast('Quantité invalide', 'error')
    run(() => stockCount({ item: it.id, counted: n, location: 'cuisine' }), 'Stock cuisine corrigé')
  }

  const threshold = it => {
    const v = window.prompt(`Seuil d'alerte cuisine pour « ${it.name} » (${it.unit}) ? 0 = pas d'alerte`, fq(it.min_cuisine).replace(/\s/g, ''))
    if (v === null) return
    const n = num(v)
    if (!(n >= 0)) return toast('Valeur invalide', 'error')
    run(() => updateStockItem(it.id, { min_cuisine: n }), 'Seuil enregistré')
  }

  const shown = items.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()))
  const inKitchen = items.filter(i => Number(i.qty_cuisine) > 0).length
  const low = items.filter(i => i.is_low_cuisine).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="card p-3">
          <div className="gt text-2xl font-bold">{inKitchen}</div>
          <div className="mut text-xs">Articles en cuisine</div>
        </div>
        <div className="card p-3" style={low ? { borderColor: 'rgba(255,90,90,.6)' } : undefined}>
          <div className="text-2xl font-bold" style={{ color: low ? '#ff6b6b' : undefined }}>{low}</div>
          <div className="mut text-xs">Stock bas</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={'btn ' + (view === 'stock' ? 'on' : '')} onClick={() => setView('stock')}>Stock cuisine</button>
        <button className={'btn ' + (view === 'hist' ? 'on' : '')} onClick={() => setView('hist')}>Historique</button>
      </div>

      {loading && <p className="mut">Chargement…</p>}

      {view === 'stock' && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="serif flex-1 text-xl font-bold">Stock Cuisine <span className="mut text-sm font-normal">(stock de travail)</span></h2>
            <input className="inp" style={{ maxWidth: 200 }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <p className="mut mb-3 text-xs">La marchandise arrive ici quand le magasin l’envoie. Déclarez ce qui est utilisé, perdu ou cassé.</p>

          {form && (
            <div className="card mb-3 p-3">
              <div className="mb-2 text-sm font-bold">{items.find(i => i.id === form.item)?.name}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input className="inp" inputMode="decimal" placeholder="Quantité" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
                <div className="flex gap-2 sm:col-span-2">
                  {REASONS.map(r => (
                    <button key={r} type="button" className={'btn sm ' + (form.reason === r ? 'on' : '')} onClick={() => setForm({ ...form, reason: r })}>
                      {r}
                    </button>
                  ))}
                </div>
                <input className="inp sm:col-span-3" placeholder="Note (facultatif)" maxLength={200} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                <button className="btn gold" onClick={submitUse} disabled={busy}>Enregistrer</button>
                <button className="btn" onClick={() => setForm(null)}>Annuler</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {shown.map(it => (
              <div key={it.id} className="row flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">
                    {it.name}
                    {it.is_low_cuisine && (
                      <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(255,90,90,.2)', color: '#ff8c8c' }}>
                        Stock bas
                      </span>
                    )}
                  </div>
                  <div className="mut text-xs">
                    {it.min_cuisine > 0 ? 'alerte à ' + fq(it.min_cuisine) + ' ' + it.unit : 'pas d’alerte'}
                    {it.last_cuisine_in_at ? ' · reçu ' + dt(it.last_cuisine_in_at) : ''}
                  </div>
                </div>
                <div className="gt text-lg font-bold" style={it.is_low_cuisine ? { color: '#ff6b6b' } : undefined}>
                  {fq(it.qty_cuisine)} <span className="text-xs">{it.unit}</span>
                </div>
                <div className="flex gap-1">
                  <button className="btn sm" onClick={() => setForm({ item: it.id, qty: '', reason: REASONS[0], note: '' })}>− Utilisé</button>
                  <button className="btn sm" onClick={() => count(it)}>Compter</button>
                  {manager && (
                    <button className="btn sm" onClick={() => threshold(it)} title="Seuil d'alerte">
                      Seuil
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!loading && !shown.length && <p className="mut text-sm">Aucun article.</p>}
          </div>
        </div>
      )}

      {view === 'hist' && (
        <div className="card p-4">
          <h2 className="serif mb-3 text-xl font-bold">Mouvements de la cuisine</h2>
          <div className="space-y-2">
            {moves.map(m => (
              <div key={m.id} className="row">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{m.stock_items?.name || 'Article'}</div>
                  <div className="mut text-xs">
                    {dt(m.moved_at)} · {m.kind === 'entree' ? 'Reçu du magasin' : m.kind === 'sortie' ? m.party || 'Utilisé' : 'Ajustement'}
                    {m.by_name ? ' · ' + m.by_name : ''}
                    {m.note ? ' · ' + m.note : ''}
                  </div>
                </div>
                <div className="text-lg font-bold" style={{ color: Number(m.qty) > 0 ? '#2dffa8' : '#ffb347' }}>
                  {Number(m.qty) > 0 ? '+' : ''}
                  {fq(m.qty)} <span className="text-xs">{m.stock_items?.unit}</span>
                </div>
              </div>
            ))}
            {!moves.length && <p className="mut text-sm">Aucun mouvement.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
