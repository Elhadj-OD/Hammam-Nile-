'use client'

import { useMemo, useState } from 'react'
import { CATEGORIES, M } from '@/lib/config'
import { toast } from '@/lib/toast'
import { usePos } from './PosProvider'

/** Prise de commande par le serveur / gérant / admin : table, plats, quantités, notes. */
export default function NewOrderTab({ onDone }) {
  const { menu, categories, tables, placeOrder } = usePos()
  const [table, setTable] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState({}) // id -> { id, name, price, qty, note }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const cats = categories.length ? categories : CATEGORIES
  const dishes = useMemo(
    () =>
      menu
        .filter(d => d.on !== false)
        .filter(d => !cat || d.cat === cat)
        .filter(d => d.name.toLowerCase().includes(q.trim().toLowerCase())),
    [menu, cat, q]
  )
  const lines = Object.values(cart)
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const count = lines.reduce((a, l) => a + l.qty, 0)

  const change = (d, delta) =>
    setCart(c => {
      const cur = c[d.id]
      const qty = (cur?.qty || 0) + delta
      const next = { ...c }
      if (qty <= 0) delete next[d.id]
      else next[d.id] = { id: d.id, name: d.name, price: d.price, qty: Math.min(qty, 99), note: cur?.note || '' }
      return next
    })

  const setLineNote = (id, v) => setCart(c => ({ ...c, [id]: { ...c[id], note: v.slice(0, 140) } }))

  const send = async () => {
    if (!table) return toast('Choisissez une table', 'error')
    if (!lines.length) return toast('Ajoutez au moins un plat', 'error')
    setBusy(true)
    const ok = await placeOrder(table, lines, note)
    setBusy(false)
    if (ok) {
      setCart({})
      setNote('')
      setTable('')
      onDone?.()
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="card p-4">
        <h2 className="serif mb-2 text-xl font-bold">1. Table</h2>
        <div className="flex flex-wrap gap-2">
          {tables.map(t => (
            <button key={t.code} type="button" className={'btn ' + (table === t.code ? 'on' : '')} onClick={() => setTable(t.code)}>
              {t.label || t.code}
            </button>
          ))}
          {!tables.length && <p className="mut text-sm">Aucune table : exécutez supabase/2_seed.sql.</p>}
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="serif flex-1 text-xl font-bold">2. Plats</h2>
          <input className="inp" style={{ maxWidth: 200 }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className={'btn sm ' + (!cat ? 'on' : '')} onClick={() => setCat('')}>
            Tout
          </button>
          {cats.map(c => (
            <button key={c.slug} type="button" className={'btn sm ' + (cat === c.slug ? 'on' : '')} onClick={() => setCat(c.slug)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {dishes.map(d => {
            const qty = cart[d.id]?.qty || 0
            return (
              <div key={d.id} className="row">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{d.name}</div>
                  <div className="mut text-xs">{M(d.price)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {qty > 0 && (
                    <>
                      <button className="btn sm" onClick={() => change(d, -1)} aria-label={'Retirer ' + d.name}>
                        −
                      </button>
                      <b className="w-6 text-center">{qty}</b>
                    </>
                  )}
                  <button className="btn sm gold" onClick={() => change(d, 1)} aria-label={'Ajouter ' + d.name}>
                    +
                  </button>
                </div>
              </div>
            )
          })}
          {!dishes.length && <p className="mut text-sm">Aucun plat.</p>}
        </div>
      </section>

      {lines.length > 0 && (
        <section className="card p-4">
          <h2 className="serif mb-2 text-xl font-bold">3. Récapitulatif</h2>
          <div className="space-y-2">
            {lines.map(l => (
              <div key={l.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>
                    {l.qty}× {l.name}
                  </span>
                  <span>{M(l.price * l.qty)}</span>
                </div>
                <input className="inp" placeholder="Note (sans oignon, bien cuit…)" maxLength={140} value={l.note} onChange={e => setLineNote(l.id, e.target.value)} />
              </div>
            ))}
          </div>
          <input className="inp mt-3" placeholder="Note pour toute la commande (facultatif)" maxLength={200} value={note} onChange={e => setNote(e.target.value)} />
        </section>
      )}

      <div className="bar fixed inset-x-0 bottom-0 z-30 p-3" style={{ paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <div className="mut text-xs">{table ? 'Table ' + table : 'Aucune table choisie'}</div>
            <b className="gt text-lg">
              {count} article{count > 1 ? 's' : ''} · {M(total)}
            </b>
          </div>
          <button className="btn gold" onClick={send} disabled={busy || !lines.length || !table}>
            {busy ? 'Envoi…' : 'Envoyer la commande'}
          </button>
        </div>
      </div>
    </div>
  )
}
