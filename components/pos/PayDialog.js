'use client'

import { useState } from 'react'
import { M, OP_CODE, PAY_METHODS, paid, rest } from '@/lib/config'
import { toast } from '@/lib/toast'
import { usePos } from './PosProvider'
import { Dialog } from './OrdersTab'

export default function PayDialog({ order, onClose }) {
  const { pay } = usePos()
  const remaining = rest(order)
  const [method, setMethod] = useState('Espèces')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState(remaining)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const a = Number(amount)
    if (!(a > 0)) return toast('Montant invalide', 'error')
    if (a > remaining + 0.01) return toast('Maximum : ' + M(remaining), 'error')
    setBusy(true)
    const ok = await pay(order.id, a, OP_CODE[method], method === 'Espèces' ? null : phone.trim())
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Dialog title={'Paiement · ' + order.table} onClose={onClose}>
      <p className="mut mb-3 text-xs">
        Total {M(order.subtotal)} · déjà payé {M(paid(order))} · <b className="gt">reste {M(remaining)}</b>
      </p>
      <label className="mut text-xs">Moyen de paiement</label>
      <select className="inp mb-2" value={method} onChange={e => setMethod(e.target.value)}>
        {PAY_METHODS.map(m => (
          <option key={m}>{m}</option>
        ))}
      </select>

      {method !== 'Espèces' && (
        <>
          <label className="mut text-xs">Numéro du client</label>
          <input
            className="inp mb-2"
            inputMode="tel"
            placeholder="22 22 22 22"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </>
      )}

      <label className="mut text-xs">Montant (MRU)</label>
      <input
        type="number"
        className="inp mb-3"
        value={amount}
        min="1"
        max={remaining}
        onChange={e => setAmount(e.target.value)}
      />
      <button className="btn grn w-full" onClick={submit} disabled={busy}>
        {busy ? 'Enregistrement…' : 'Valider le paiement'}
      </button>
    </Dialog>
  )
}
