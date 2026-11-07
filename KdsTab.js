'use client'

import { useEffect, useState } from 'react'
import { ST_LABEL } from '@/lib/config'
import { usePos } from './PosProvider'

function minutesSince(t) {
  return Math.max(0, Math.floor((Date.now() - t) / 60000))
}

export default function KdsTab() {
  const { orders, setStatus } = usePos()
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const list = orders
    .filter(o => o.status !== 'annule' && !o.closed && o.st !== 'Servi' && o.items.length)
    .sort((a, b) => a.t - b.t)

  const column = (label, title) => {
    const l = list.filter(o => o.st === label)
    return (
      <div>
        <h3 className="serif gt mb-2 font-bold">
          {title} ({l.length})
        </h3>
        <div className="space-y-3">
          {l.map(o => {
            const mins = minutesSince(o.t)
            const late = mins >= 10 && o.st === 'Attente'
            return (
              <article key={o.id} className={'card p-3 ' + (late ? 'late' : '')}>
                <div className="mb-2 flex items-center justify-between">
                  <b className="serif text-lg">{o.table}</b>
                  <span className="chip">{mins} min</span>
                </div>
                {o.items.map(i => (
                  <div key={i.id} className="py-0.5 text-base">
                    <b className="gt">{i.qty}×</b> {i.name}
                    {i.note && <i className="mut text-sm"> — {i.note}</i>}
                  </div>
                ))}
                <button
                  className="btn gold mt-2 w-full text-sm"
                  onClick={() => setStatus(o.id, o.st === 'Attente' ? 'Prêt' : 'Servi')}
                >
                  Marquer {o.st === 'Attente' ? 'prêt' : 'servi'}
                </button>
              </article>
            )
          })}
          {!l.length && <p className="mut text-sm">Rien ici.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {column(ST_LABEL.attente, 'En préparation')}
      {column(ST_LABEL.pret, 'Prêtes à servir')}
    </div>
  )
}
