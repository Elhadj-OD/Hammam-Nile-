'use client'

import { useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { M, OP_LABEL, PAY_METHODS, dt, rest } from '@/lib/config'
import { toast } from '@/lib/toast'
import { usePos } from './PosProvider'

const KPI = ({ label, value, sub, tone = '' }) => (
  <div className="card p-4">
    <div className="mut text-sm">{label}</div>
    <div className={'serif mt-1 text-2xl font-bold ' + tone}>{value}</div>
    {sub && <div className="mut mt-1 text-xs">{sub}</div>}
  </div>
)

export default function StatsTab() {
  const { orders, expenses, addExpense, deleteExpense } = usePos()
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const stats = useMemo(() => {
    const pays = orders.flatMap(o => o.pays.map(p => ({ ...p, table: o.table }))).sort((a, b) => b.t - a.t)
    const rev = pays.reduce((a, p) => a + p.amt, 0)
    const cash = pays.filter(p => p.op === 'Espèces').reduce((a, p) => a + p.amt, 0)
    const due = orders.reduce((a, o) => a + rest(o), 0)
    const today = new Date().toDateString()
    const todayCount = orders.filter(o => new Date(o.t).toDateString() === today).length
    const closedCount = orders.filter(o => o.closed).length

    const agg = {}
    orders.forEach(o => o.items.forEach(i => {
      const a = agg[i.name] || (agg[i.name] = { q: 0, r: 0 })
      a.q += i.qty
      a.r += i.qty * i.price
    }))
    const top = Object.entries(agg)
      .sort((a, b) => b[1].q - a[1].q)
      .slice(0, 5)

    const days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      return d
    })
    const byDay = days.map(d => {
      const key = d.toDateString()
      return {
        label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
        rev: pays.filter(p => new Date(p.t).toDateString() === key).reduce((a, p) => a + p.amt, 0),
        exp: expenses.filter(e => new Date(e.t).toDateString() === key).reduce((a, e) => a + e.p, 0)
      }
    })
    const maxDay = Math.max(1, ...byDay.map(d => Math.max(d.rev, d.exp)))
    const byMethod = PAY_METHODS.map(m => ({
      label: m,
      total: pays.filter(p => p.op === m).reduce((a, p) => a + p.amt, 0)
    }))
    const totalExp = expenses.reduce((a, e) => a + e.p, 0)
    return { pays, rev, cash, due, todayCount, closedCount, top, byDay, maxDay, byMethod, totalExp }
  }, [orders, expenses])

  const saveExpense = async () => {
    if (!label.trim() || !(Number(amount) > 0)) return toast('Produit et prix requis', 'error')
    const ok = await addExpense(label.trim(), amount)
    if (ok) {
      setLabel('')
      setAmount('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Recette totale (30 j)" value={M(stats.rev)} sub={stats.closedCount + ' commande(s) encaissée(s)'} tone="gt" />
        <KPI label="Commandes du jour" value={stats.todayCount} sub={orders.filter(o => !o.closed).length + ' en cours'} />
        <KPI label="Espèces (tiroir)" value={M(stats.cash)} sub="Montant liquide" />
        <KPI label="Mobile (Bankily, Masrivi…)" value={M(stats.rev - stats.cash)} sub="Virements" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KPI label="Dépenses" value={M(stats.totalExp)} tone="text-red-300" />
        <KPI label="Bénéfice" value={M(stats.rev - stats.totalExp)} />
        <KPI label="Reste à encaisser" value={M(stats.due)} tone="text-amber-300" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="card p-3 lg:col-span-2">
          <h3 className="serif mb-3 text-sm font-bold">Revenus &amp; dépenses (7 jours)</h3>
          <div className="flex h-40 items-end justify-between gap-2">
            {stats.byDay.map(d => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t"
                    style={{
                      height: d.rev ? (d.rev / stats.maxDay) * 100 + '%' : 0,
                      background: 'var(--gold)'
                    }}
                    title={'Revenus ' + M(d.rev)}
                  />
                  <div
                    className="w-1/2 rounded-t"
                    style={{
                      height: d.exp ? (d.exp / stats.maxDay) * 100 + '%' : 0,
                      background: '#d9556a'
                    }}
                    title={'Dépenses ' + M(d.exp)}
                  />
                </div>
                <span className="mut text-[.65rem]">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mut mt-2 flex gap-4 text-xs">
            <span><b style={{ color: 'var(--gold)' }}>■</b> Revenus</span>
            <span><b style={{ color: '#d9556a' }}>■</b> Dépenses</span>
          </div>
        </div>

        <div className="card p-3">
          <h3 className="serif mb-3 text-sm font-bold">Paiements par moyen</h3>
          <div className="space-y-2">
            {stats.byMethod.map(m => {
              const pct = stats.rev ? Math.round((m.total / stats.rev) * 100) : 0
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-xs">
                    <span>{m.label}</span>
                    <span className="mut">
                      {M(m.total)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}>
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--gold)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="serif gt mb-3 font-bold">Top des ventes</h3>
        <div className="space-y-2">
          {stats.top.map(([name, a], i) => (
            <div key={name} className="row">
              <span className="rank">#{i + 1}</span>
              <span className="flex-1 text-sm font-semibold">{name}</span>
              <div className="text-right">
                <div className="gt text-sm font-bold">{a.q} vendu{a.q > 1 ? 's' : ''}</div>
                <div className="mut text-xs">{M(a.r)}</div>
              </div>
            </div>
          ))}
          {!stats.top.length && <p className="mut text-sm">Pas encore de ventes.</p>}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-3">
          <h3 className="serif mb-2 font-bold">Paiements reçus</h3>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="mut text-left">
                  <th className="pb-1">Date</th>
                  <th>Table</th>
                  <th>Moyen</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {stats.pays.slice(0, 60).map((p, i) => (
                  <tr key={i} className="bd border-t">
                    <td className="py-1">{dt(p.t)}</td>
                    <td>{p.table}</td>
                    <td>{OP_LABEL[p.op] || p.op}</td>
                    <td className="gt text-right font-bold">{M(p.amt)}</td>
                  </tr>
                ))}
                {!stats.pays.length && (
                  <tr>
                    <td colSpan={4} className="mut py-3 text-center">
                      Aucun paiement enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-3">
          <h3 className="serif mb-2 font-bold">Dépenses (stock, charges)</h3>
          <div className="mb-2 flex gap-2">
            <input
              className="inp"
              placeholder="Produit (gaz, charbon…)"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={120}
            />
            <input
              type="number"
              className="inp"
              style={{ maxWidth: 110 }}
              placeholder="MRU"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="1"
            />
            <button className="btn gold" onClick={saveExpense}>
              Ajouter
            </button>
          </div>
          <div className="max-h-64 overflow-auto">
            {expenses.map(e => (
              <div key={e.id} className="bd flex items-center gap-2 border-t py-1.5 text-sm">
                <span className="flex-1">{e.n}</span>
                <span className="mut text-xs">{dt(e.t)}</span>
                <b className="text-red-300">{M(e.p)}</b>
                <button className="btn sm red" onClick={() => deleteExpense(e.id)} aria-label="Supprimer">
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
            {!expenses.length && <p className="mut py-2 text-sm">Aucune dépense enregistrée.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
