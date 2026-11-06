'use client'

import { useState } from 'react'
import Icon from '@/components/Icon'
import { M, ST_NEXT, hm, ticketNo, tot, paid, rest } from '@/lib/config'
import { usePos } from './PosProvider'
import PayDialog from './PayDialog'

export function OrderLines({ items }) {
  return (
    <div className="space-y-0.5">
      {items.map(i => (
        <div key={i.id} className="flex justify-between gap-2 text-sm">
          <span>
            {i.qty}× {i.name}
            {i.note && <i className="mut"> ({i.note})</i>}
          </span>
          <span className="whitespace-nowrap">{M(i.qty * i.price)}</span>
        </div>
      ))}
    </div>
  )
}

export default function OrdersTab() {
  const { orders, menu, staff, isAdmin, setStatus, removeOrder, moveOrder } = usePos()
  const [payOrder, setPayOrder] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  void menu

  const open = orders.filter(o => !o.closed && o.status !== 'annule')

  if (!open.length) return <p className="mut">Aucune commande en cours.</p>

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {open.map(o => {
          const r = rest(o)
          const nextLabel = ST_NEXT[Math.min(ST_NEXT.indexOf(o.st) + 1, 2)]
          return (
            <article key={o.id} className="card space-y-1 p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <b className="serif text-base">{o.table}</b>
                <span className="mut text-xs">
                  {hm(o.t)} · {ticketNo(o)}
                </span>
              </div>
              <OrderLines items={o.items} />
              <div className="bd flex justify-between border-t pt-1 font-bold">
                <span>Total</span>
                <span className="gt">{M(o.subtotal)}</span>
              </div>
              <div className={'flex justify-between ' + (r > 0 ? 'text-red-300' : 'text-emerald-400')}>
                <span>Payé {M(paid(o))}</span>
                <span>{r > 0 ? 'Reste ' + M(r) : 'Soldé'}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-2">
                <button className="btn sm col-span-2" onClick={() => setStatus(o.id, nextLabel)}>
                  {o.st} ›
                </button>
                <button
                  className={'btn sm ' + (r > 0 ? 'gold' : 'opacity-50')}
                  onClick={() => setPayOrder(o)}
                  disabled={r <= 0}
                >
                  Payer
                </button>
                <button
                  className="btn sm"
                  onClick={() => setEditOrder(o)}
                  aria-label={'Modifier ' + o.table}
                  title="Changer de table / imprimer"
                >
                  <Icon name="pencil" size={14} />
                </button>
              </div>
              {(isAdmin || staff?.role === 'gerant') && (
                <button
                  className="btn sm red w-full"
                  onClick={() => {
                    if (confirm('Supprimer définitivement la commande ' + ticketNo(o) + ' ?')) removeOrder(o.id)
                  }}
                >
                  <Icon name="trash" size={13} /> Supprimer
                </button>
              )}
            </article>
          )
        })}
      </div>

      {payOrder && <PayDialog order={payOrder} onClose={() => setPayOrder(null)} />}
      {editOrder && (
        <MoveDialog order={editOrder} onClose={() => setEditOrder(null)} onMove={moveOrder} />
      )}
    </>
  )
}

function MoveDialog({ order, onClose, onMove }) {
  const { tables } = usePos()
  const [code, setCode] = useState(order.tableCode)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const ok = await onMove(order.id, code)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Dialog title={'Commande ' + ticketNo(order)} onClose={onClose}>
      <label className="mut text-xs">Table</label>
      <select className="inp mb-3" value={code} onChange={e => setCode(e.target.value)}>
        {tables.map(t => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
      </select>
      <button className="btn gold w-full" onClick={save} disabled={busy}>
        Enregistrer la table
      </button>
    </Dialog>
  )
}

export function Dialog({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: 'rgba(15,3,7,.55)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card pop w-full max-w-sm p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="serif text-lg font-bold">{title}</h3>
          <button className="btn sm" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export { tot }
