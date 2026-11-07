'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { dt } from '@/lib/config'
import { toast } from '@/lib/toast'
import {
  DESTINATIONS,
  UNITS,
  addStockItem,
  archiveStockItem,
  listMovements,
  listStock,
  stockCount,
  stockIn,
  stockOut
} from '@/lib/api/stock'

const num = v => Number(String(v).replace(',', '.'))
const fq = n => Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
const VIEWS = [
  ['stock', 'Stock'],
  ['entree', '↓ Entrée'],
  ['sortie', '↑ Sortie vers resto'],
  ['hist', 'Historique']
]
const KIND = {
  entree: { label: 'Entrée', color: '#2dffa8' },
  sortie: { label: 'Sortie', color: '#ffb347' },
  ajustement: { label: 'Ajustement', color: '#b2c9be' }
}

export default function StockTab() {
  const [view, setView] = useState('stock')
  const [items, setItems] = useState([])
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ item: '', qty: '', cost: '', party: '', note: '' })
  const [adding, setAdding] = useState(false)
  const [nw, setNw] = useState({ name: '', unit: UNITS[0], category: '', minQty: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([listStock(), listMovements({ limit: 300 })])
      setItems(s || [])
      setMoves(m || [])
    } catch (e) {
      toast('Inventaire : ' + e.message, 'error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const byId = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])
  const current = byId[form.item]
  const lowCount = items.filter(i => i.is_low).length
  const outToday = moves.filter(m => m.kind === 'sortie' && sameDay(m.moved_at, Date.now())).length
  const shown = items.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase()))
  const history = moves.filter(m => !filter || m.kind === filter)

  const go = (v, itemId = '') => {
    setForm({ item: itemId, qty: '', cost: '', party: '', note: '' })
    setView(v)
  }

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

  const submitIn = async () => {
    const qty = num(form.qty)
    if (!form.item || !(qty > 0)) return toast('Choisissez un article et une quantité', 'error')
    const ok = await run(
      () => stockIn({ item: form.item, qty, unitCost: form.cost === '' ? null : num(form.cost), supplier: form.party, note: form.note }),
      'Entrée enregistrée au magasin'
    )
    if (ok) setForm({ item: '', qty: '', cost: '', party: '', note: '' })
  }

  const submitOut = async () => {
    const qty = num(form.qty)
    if (!form.item || !(qty > 0)) return toast('Choisissez un article et une quantité', 'error')
    if (current && qty > Number(current.qty_on_hand)) return toast('Stock insuffisant : ' + fq(current.qty_on_hand) + ' ' + current.unit + ' disponible', 'error')
    const ok = await run(
      () => stockOut({ item: form.item, qty, destination: form.party || 'Cuisine', note: form.note }),
      'Sortie vers le restaurant enregistrée'
    )
    if (ok) setForm({ item: '', qty: '', cost: '', party: '', note: '' })
  }

  const count = it => {
    const v = window.prompt(`Quantité réellement comptée pour « ${it.name} » (${it.unit}) ?`, fq(it.qty_on_hand).replace(/\s/g, ''))
    if (v === null) return
    const n = num(v)
    if (!(n >= 0)) return toast('Quantité invalide', 'error')
    run(() => stockCount({ item: it.id, counted: n }), 'Stock corrigé')
  }

  const archive = it => {
    if (!window.confirm(`Archiver « ${it.name} » ? L'historique est conservé.`)) return
    run(() => archiveStockItem(it.id), 'Article archivé')
  }

  const createItem = async () => {
    if (!nw.name.trim()) return toast("Nom de l'article requis", 'error')
    const ok = await run(() => addStockItem({ ...nw, minQty: num(nw.minQty || 0) }), 'Article ajouté')
    if (ok) {
      setNw({ name: '', unit: UNITS[0], category: '', minQty: '' })
      setAdding(false)
    }
  }

  const picker = (
    <select className="inp sm:col-span-2" value={form.item} onChange={e => set('item', e.target.value)}>
      <option value="">— Article —</option>
      {items.map(i => (
        <option key={i.id} value={i.id}>
          {i.name} ({fq(i.qty_on_hand)} {i.unit})
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3">
          <div className="gt text-2xl font-bold">{items.length}</div>
          <div className="mut text-xs">Articles</div>
        </div>
        <div className="card p-3" style={lowCount ? { borderColor: 'rgba(255,90,90,.6)' } : undefined}>
          <div className="text-2xl font-bold" style={{ color: lowCount ? '#ff6b6b' : undefined }}>{lowCount}</div>
          <div className="mut text-xs">Stock bas</div>
        </div>
        <div className="card p-3">
          <div className="gt text-2xl font-bold">{outToday}</div>
          <div className="mut text-xs">Sorties aujourd’hui</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map(([k, l]) => (
          <button key={k} className={'btn ' + (view === k ? 'on' : '')} onClick={() => go(k)}>
            {l}
          </button>
        ))}
      </div>

      {loading && <p className="mut">Chargement du magasin…</p>}

      {view === 'stock' && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="serif flex-1 text-xl font-bold">Stock du magasin</h2>
            <input className="inp" style={{ maxWidth: 200 }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn gold" onClick={() => setAdding(a => !a)}>
              + Nouvel article
            </button>
          </div>

          {adding && (
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              <input className="inp sm:col-span-2" placeholder="Nom de l'article" maxLength={80} value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} />
              <select className="inp" value={nw.unit} onChange={e => setNw({ ...nw, unit: e.target.value })}>
                {UNITS.map(u => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <input className="inp" inputMode="decimal" placeholder="Seuil d'alerte" value={nw.minQty} onChange={e => setNw({ ...nw, minQty: e.target.value })} />
              <input className="inp sm:col-span-3" placeholder="Catégorie (facultatif) : viandes, boissons…" maxLength={40} value={nw.category} onChange={e => setNw({ ...nw, category: e.target.value })} />
              <button className="btn gold" onClick={createItem} disabled={busy}>
                Ajouter
              </button>
            </div>
          )}

          <div className="space-y-2">
            {shown.map(it => (
              <div key={it.id} className="row flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">
                    {it.name}
                    {it.is_low && (
                      <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(255,90,90,.2)', color: '#ff8c8c' }}>
                        Stock bas
                      </span>
                    )}
                  </div>
                  <div className="mut text-xs">
                    {it.category ? it.category + ' · ' : ''}alerte à {fq(it.min_qty)} {it.unit}
                    {it.last_in_at ? ' · entrée ' + dt(it.last_in_at) : ''}
                    {it.last_out_at ? ' · sortie ' + dt(it.last_out_at) : ''}
                  </div>
                </div>
                <div className="gt text-lg font-bold" style={it.is_low ? { color: '#ff6b6b' } : undefined}>
                  {fq(it.qty_on_hand)} <span className="text-xs">{it.unit}</span>
                </div>
                <div className="flex gap-1">
                  <button className="btn sm" onClick={() => go('entree', it.id)}>↓ Entrée</button>
                  <button className="btn sm" onClick={() => go('sortie', it.id)}>↑ Resto</button>
                  <button className="btn sm" onClick={() => count(it)}>Compter</button>
                  <button className="btn sm red" onClick={() => archive(it)} aria-label={'Archiver ' + it.name}>×</button>
                </div>
              </div>
            ))}
            {!loading && !shown.length && <p className="mut text-sm">Aucun article.</p>}
          </div>
        </div>
      )}

      {view === 'entree' && (
        <div className="card p-4">
          <h2 className="serif mb-1 text-xl font-bold">Entrée au magasin</h2>
          <p className="mut mb-3 text-sm">Marchandise reçue d’un fournisseur : elle s’ajoute au stock du magasin.</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {picker}
            <input className="inp" inputMode="decimal" placeholder={'Quantité' + (current ? ' (' + current.unit + ')' : '')} value={form.qty} onChange={e => set('qty', e.target.value)} />
            <input className="inp" inputMode="decimal" placeholder="Prix unitaire MRU (facultatif)" value={form.cost} onChange={e => set('cost', e.target.value)} />
            <input className="inp sm:col-span-2" placeholder="Fournisseur" maxLength={80} value={form.party} onChange={e => set('party', e.target.value)} />
            <input className="inp sm:col-span-2" placeholder="Note (n° de bon, remarque…)" maxLength={200} value={form.note} onChange={e => set('note', e.target.value)} />
            <button className="btn gold sm:col-span-4" onClick={submitIn} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer l’entrée'}
            </button>
          </div>
        </div>
      )}

      {view === 'sortie' && (
        <div className="card p-4">
          <h2 className="serif mb-1 text-xl font-bold">Sortie du magasin vers le restaurant</h2>
          <p className="mut mb-3 text-sm">Marchandise remise à la cuisine, au bar ou en salle : elle est retirée du stock du magasin.</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {picker}
            <input className="inp" inputMode="decimal" placeholder={'Quantité' + (current ? ' (' + current.unit + ')' : '')} value={form.qty} onChange={e => set('qty', e.target.value)} />
            <div className="mut flex items-center text-sm">{current ? 'Disponible : ' + fq(current.qty_on_hand) + ' ' + current.unit : ''}</div>
            <div className="flex flex-wrap gap-2 sm:col-span-4">
              {DESTINATIONS.map(d => (
                <button key={d} type="button" className={'btn sm ' + ((form.party || 'Cuisine') === d ? 'on' : '')} onClick={() => set('party', d)}>
                  {d}
                </button>
              ))}
            </div>
            <input className="inp sm:col-span-4" placeholder="Note (facultatif)" maxLength={200} value={form.note} onChange={e => set('note', e.target.value)} />
            <button className="btn gold sm:col-span-4" onClick={submitOut} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Sortir vers le restaurant'}
            </button>
          </div>
        </div>
      )}

      {view === 'hist' && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="serif flex-1 text-xl font-bold">Mouvements du magasin</h2>
            {[['', 'Tout'], ['entree', 'Entrées'], ['sortie', 'Sorties'], ['ajustement', 'Ajustements']].map(([k, l]) => (
              <button key={k} className={'btn sm ' + (filter === k ? 'on' : '')} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {history.map(m => (
              <div key={m.id} className="row">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{m.stock_items?.name || 'Article'}</div>
                  <div className="mut text-xs">
                    {dt(m.moved_at)} · {KIND[m.kind].label}
                    {m.party ? ' · ' + m.party : ''}
                    {m.unit_cost != null ? ' · ' + fq(m.unit_cost) + ' MRU/u' : ''}
                    {m.by_name ? ' · ' + m.by_name : ''}
                    {m.note ? ' · ' + m.note : ''}
                  </div>
                </div>
                <div className="text-lg font-bold" style={{ color: KIND[m.kind].color }}>
                  {Number(m.qty) > 0 ? '+' : ''}
                  {fq(m.qty)} <span className="text-xs">{m.stock_items?.unit}</span>
                </div>
              </div>
            ))}
            {!history.length && <p className="mut text-sm">Aucun mouvement.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
