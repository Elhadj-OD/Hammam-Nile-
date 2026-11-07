'use client'

import { useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { BRAND, M, dt, hm, ticketNo } from '@/lib/config'
import { usePos } from './PosProvider'
import { OrderLines, Dialog } from './OrdersTab'

export default function HistoryTab() {
  const { orders, isAdmin, purge } = usePos()
  const [todayOnly, setTodayOnly] = useState(true)
  const [ticket, setTicket] = useState(null)

  const today = new Date().toDateString()
  const list = useMemo(
    () =>
      orders
        .filter(o => o.status !== 'annule')
        .filter(o => !todayOnly || new Date(o.t).toDateString() === today)
        .sort((a, b) => b.t - a.t),
    [orders, todayOnly, today]
  )

  const pays = list.flatMap(o => o.pays)
  const rev = pays.reduce((a, p) => a + p.amt, 0)
  const cash = pays.filter(p => p.op === 'Espèces').reduce((a, p) => a + p.amt, 0)

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="serif text-xl font-bold">Historique &amp; tickets</h2>
          <p className="mut text-sm">
            {list.length} ticket(s) · encaissé {M(rev)} · espèces {M(cash)} · mobile {M(rev - cash)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={'btn ' + (todayOnly ? 'on' : '')} onClick={() => setTodayOnly(true)}>
            Aujourd’hui
          </button>
          <button className={'btn ' + (!todayOnly ? 'on' : '')} onClick={() => setTodayOnly(false)}>
            Tout (30 j)
          </button>
          {isAdmin && (
            <button
              className="btn red"
              onClick={() => {
                if (confirm('Purger les commandes soldées ? (action définitive)')) purge()
              }}
            >
              <Icon name="trash" size={14} /> Purger
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 720 }}>
            <thead>
              <tr className="mut text-left" style={{ background: 'rgba(217,180,63,.08)' }}>
                <th className="p-2">Heure / Date</th>
                <th>N° Ticket</th>
                <th>Table</th>
                <th>Articles</th>
                <th>Paiement</th>
                <th className="text-right">Total</th>
                <th className="text-center">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {list.map(o => (
                <tr key={o.id} className="bd border-t align-top">
                  <td className="p-2">
                    {hm(o.t)}
                    <div className="mut">{new Date(o.t).toLocaleDateString('fr-FR')}</div>
                  </td>
                  <td className="font-bold">{ticketNo(o)}</td>
                  <td>{o.table}</td>
                  <td className="mut">{o.items.map(i => i.qty + 'x ' + i.name).join(', ')}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {o.pays.length ? (
                        o.pays.map((p, i) => (
                          <span key={i} className="chip">
                            {p.op} {M(p.amt)}
                          </span>
                        ))
                      ) : (
                        <span className="mut">non payé</span>
                      )}
                    </div>
                  </td>
                  <td className="gt text-right font-bold">{M(o.subtotal)}</td>
                  <td className="text-center">
                    <button className="btn sm" onClick={() => setTicket(o)} aria-label="Voir le ticket">
                      <Icon name="printer" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={7} className="mut p-4 text-center">
                    Aucun ticket pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ticket && <TicketModal order={ticket} onClose={() => setTicket(null)} />}
    </div>
  )
}

export function TicketModal({ order, onClose }) {
  return (
    <Dialog title={'Ticket ' + ticketNo(order)} onClose={onClose}>
      <div id="print-area">
        <div className="serif text-center text-lg font-bold">{BRAND.n}</div>
        <div className="mut text-center text-xs">
          Ticket {ticketNo(order)} · {dt(order.t)}
          <br />
          {order.table}
        </div>
        <div className="bd mt-2 border-t pt-2 text-sm">
          <OrderLines items={order.items} />
        </div>
        <div className="bd mt-1 flex justify-between border-t pt-1 font-bold">
          <span>Total</span>
          <span>{M(order.subtotal)}</span>
        </div>
        <div className="mut mt-1 text-xs">
          {order.pays.length ? order.pays.map(p => p.op + ' ' + M(p.amt)).join(' · ') : 'Non payé'}
        </div>
        <div className="mt-1 text-center text-xs">Merci de votre visite !</div>
      </div>
      <button className="btn gold mt-3 w-full no-print" onClick={() => window.print()}>
        <Icon name="printer" /> Imprimer
      </button>
    </Dialog>
  )
}
