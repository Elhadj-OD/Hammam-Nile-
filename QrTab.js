'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import Icon from '@/components/Icon'
import { toast } from '@/lib/toast'
import { usePos } from './PosProvider'
import { Dialog } from './OrdersTab'

export default function QrTab() {
  const { qrTables } = usePos()
  const [imgs, setImgs] = useState({})
  const [origin, setOrigin] = useState('')
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const links = useMemo(() => {
    const map = {}
    qrTables.forEach(t => {
      if (t.qr_token) map[t.code] = `${origin}/?t=${t.code}&k=${t.qr_token}`
    })
    return map
  }, [qrTables, origin])

  useEffect(() => {
    if (!origin) return
    let alive = true
    ;(async () => {
      const map = {}
      for (const t of qrTables) {
        if (!t.qr_token) continue
        map[t.code] = await QRCode.toDataURL(`${origin}/?t=${t.code}&k=${t.qr_token}`, {
          margin: 1,
          width: 420,
          errorCorrectionLevel: 'H',
          color: { dark: '#00241d', light: '#ffffff' }
        })
      }
      if (alive) setImgs(map)
    })()
    return () => {
      alive = false
    }
  }, [qrTables, origin])

  // tables numérotées d'abord, "À emporter" à la fin
  const ordered = useMemo(
    () => [...qrTables].sort((a, b) => (a.code.startsWith('T') === b.code.startsWith('T') ? a.code.localeCompare(b.code) : a.code.startsWith('T') ? -1 : 1)),
    [qrTables]
  )

  const copy = async code => {
    try {
      await navigator.clipboard.writeText(links[code])
      toast('Lien copié')
    } catch {
      toast('Copie impossible sur cet appareil', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="serif text-xl font-bold">QR codes des tables</h2>
          <p className="mut text-sm">
            {qrTables.length} table(s) · un QR par table, chaque lien contient le jeton secret de la table.
          </p>
        </div>
        <button className="btn gold" onClick={() => setPrinting(true)}>
          <Icon name="printer" /> Imprimer la planche
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map(t => (
          <div key={t.code} className="card flex flex-col items-center gap-2 p-3">
            <div className="serif gt font-bold">{t.label}</div>
            {imgs[t.code] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgs[t.code]} alt={'QR ' + t.label} className="w-full max-w-[160px] rounded-lg bg-white p-1" />
            ) : (
              <div className="mut py-8 text-xs">…</div>
            )}
            <div className="flex w-full gap-1">
              <button className="btn sm flex-1" onClick={() => copy(t.code)}>
                Copier le lien
              </button>
              <a className="btn sm" href={links[t.code]} target="_blank" rel="noreferrer" title="Tester">
                ↗
              </a>
            </div>
            <code className="mut w-full truncate text-[.6rem]" title={links[t.code]}>
              {t.code} · {t.qr_token?.slice(0, 8)}…
            </code>
          </div>
        ))}
      </div>

      <p className="mut text-xs">
        Astuce : si un QR a fuité, régénère son jeton en base{' '}
        <code>{"update public.resto_tables set qr_token = gen_random_uuid() where code = 'T07';"}</code>
        , puis réimprime la planche. Les jetons ne sont lisibles que par l’équipe connectée.
      </p>

      {printing && (
        <Dialog title="Planche à imprimer" onClose={() => setPrinting(false)}>
          <div id="print-area">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
            >
              {ordered.map(t => (
                <div
                  key={t.code}
                  className="flex flex-col items-center rounded-lg border p-2"
                  style={{ borderColor: 'var(--edge)', breakInside: 'avoid' }}
                >
                  <div className="serif text-xs font-bold" style={{ color: '#00241d' }}>
                    {t.label}
                  </div>
                  {imgs[t.code] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgs[t.code]} alt="" style={{ width: '100%', maxWidth: 110 }} />
                  )}
                  <div className="text-[.5rem]" style={{ color: '#6b5c58' }}>
                    Café Dugout · scannez pour commander
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn gold no-print mt-3 w-full" onClick={() => window.print()}>
            <Icon name="printer" /> Imprimer
          </button>
        </Dialog>
      )}
    </div>
  )
}
