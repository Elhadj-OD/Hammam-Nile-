'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '@/components/Icon'
import { BRAND } from '@/lib/config'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { toast } from '@/lib/toast'

const KEY = 'dugout:autoprint'
const ROLE = { admin: 'Admin', gerant: 'Gérant', serveur: 'Serveur', cuisine: 'Cuisine' }
const no = n => 'CD-' + String(n ?? '').padStart(4, '0')
const when = t =>
  new Date(t).toLocaleString('fr-FR', { timeZone: 'Africa/Nouakchott', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Réimprime les bons d'une commande (bouton « Bon » de la liste des commandes). */
export async function reprintOrder(orderId) {
  const sb = supabaseBrowser()
  const { data, error } = await sb.from('order_tickets').select('*').eq('order_id', orderId).order('created_at')
  if (error) return toast('Bon introuvable : ' + error.message, 'error')
  if (!data?.length) return toast('Aucun bon enregistré pour cette commande', 'error')
  window.dispatchEvent(new CustomEvent('dugout:print', { detail: data }))
}

/**
 * Poste d'impression : sur le PC relié à l'imprimante, activer « Impression auto ».
 * Chaque nouvelle commande sort alors sur papier : numéro, table, heure, qui l'a lancée, plats.
 */
export default function PrintStation() {
  const [on, setOn] = useState(false)
  const [ticket, setTicket] = useState(null)
  const queue = useRef([])
  const running = useRef(false)

  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) === '1')
    } catch {}
  }, [])

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length) {
      setTicket(queue.current.shift())
      await new Promise(r => setTimeout(r, 300)) // laisse React dessiner le bon
      try {
        window.print()
      } catch {}
      await new Promise(r => setTimeout(r, 1200))
    }
    setTicket(null)
    running.current = false
  }, [])

  useEffect(() => {
    const h = e => {
      queue.current.push(...e.detail)
      pump()
    }
    window.addEventListener('dugout:print', h)
    return () => window.removeEventListener('dugout:print', h)
  }, [pump])

  useEffect(() => {
    if (!on) return
    const sb = supabaseBrowser()
    let stop = false
    const tick = async () => {
      if (stop || running.current) return
      const { data, error } = await sb.rpc('staff_claim_tickets', { p_limit: 10 })
      if (!error && data?.length) {
        queue.current.push(...[...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
        pump()
      }
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [on, pump])

  const toggle = () => {
    const v = !on
    setOn(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {}
    toast(v ? 'Impression automatique activée sur cet appareil' : 'Impression automatique désactivée')
  }

  const test = () =>
    window.dispatchEvent(
      new CustomEvent('dugout:print', {
        detail: [{ id: 'test', order_no: 0, table_label: 'TEST', by_name: 'Test imprimante', by_role: 'admin', created_at: new Date().toISOString(), lines: [{ name: 'Café noir', qty: 1, note: null }], note: null }]
      })
    )

  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={'btn sm ' + (on ? 'on' : '')} onClick={toggle} title="À activer sur le PC relié à l'imprimante">
          <Icon name="printer" size={14} /> Impression auto : {on ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="btn sm" onClick={test}>
          Test
        </button>
      </div>

      {ticket && (
        <div id="ticket-print">
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '16pt' }}>{BRAND.n}</div>
          <div style={{ textAlign: 'center', fontSize: '9pt' }}>BON DE COMMANDE</div>
          <hr />
          <div style={{ fontSize: '22pt', fontWeight: 800 }}>{ticket.table_label}</div>
          <div style={{ fontSize: '11pt' }}>N° {no(ticket.order_no)}</div>
          <div style={{ fontSize: '11pt' }}>{when(ticket.created_at)}</div>
          <div style={{ fontSize: '11pt' }}>
            Pris par : <b>{ticket.by_name || '—'}</b> ({ROLE[ticket.by_role] || ticket.by_role || '—'})
          </div>
          <hr />
          {(ticket.lines || []).map((l, i) => (
            <div key={i} style={{ marginBottom: '2mm' }}>
              <div style={{ fontSize: '14pt', fontWeight: 800 }}>
                {l.qty} × {l.name}
              </div>
              {l.note && <div style={{ fontSize: '11pt' }}>» {l.note}</div>}
            </div>
          ))}
          {ticket.note && (
            <>
              <hr />
              <div style={{ fontSize: '11pt' }}>Note : {ticket.note}</div>
            </>
          )}
          <hr />
          <div style={{ textAlign: 'center', fontSize: '9pt' }}>— fin du bon —</div>
        </div>
      )}
    </>
  )
}
