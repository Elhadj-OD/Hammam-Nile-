'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { InstallButton } from '@/components/PwaRegister'
import { BRAND, CATEGORIES, M, SPEC_SLUGS, ST_LABEL } from '@/lib/config'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { toast } from '@/lib/toast'
import { enqueue, startAutoSync, newClientRef } from '@/lib/offline/outbox'

const safeImg = u => (typeof u === 'string' && /^(https?:\/\/|data:image\/)/i.test(u) ? u : '')
const TABLE_KEY = 'cc_table'

function normalizeOrder(x, label) {
  if (!x) return null
  return {
    id: x.id,
    status: ST_LABEL[x.status] || 'Attente',
    subtotal: Number(x.subtotal || 0),
    opened_at: x.opened_at,
    paid: Number(x.paid || 0),
    table: label || '',
    items: (x.items || []).map(i => ({
      id: i.id,
      menu_item_id: i.menu_item_id,
      name: i.name,
      price: Number(i.price),
      qty: i.qty,
      note: i.note || ''
    }))
  }
}

export default function ClientMenu({ t = '', k = '', s: sessionToken = '' }) {
  const sb = supabaseBrowser()
  const [menu, setMenu] = useState([])
  const [cats, setCats] = useState([])
  const [tables, setTables] = useState([])
  const [code, setCode] = useState('')        // table choisie (ex. 'T07')
  const [qrCode, setQrCode] = useState('')    // table imposée par le QR (si scan)
  const [order, setOrder] = useState(null)
  const [cart, setCart] = useState([])
  const [cat, setCat] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState(false)
  const [noteDish, setNoteDish] = useState(null)
  const [noteText, setNoteText] = useState('')

  const tableLabel = useMemo(() => {
    const found = tables.find(x => x.code === code)
    if (found) return found.label
    if (code === 'EMP') return 'À emporter'
    return code || '—'
  }, [tables, code])

  /* ---------------- menu + liste des tables ---------------- */
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const [m, tb, cr] = await Promise.all([
        sb.from('menu_items').select('id,name,description,price,category_slug,image_url,sort_order').order('sort_order'),
        sb.from('v_tables_public').select('code,label').order('code'),
        sb.from('categories').select('slug,label,icon_url')
      ])
      if (!alive) return
      if (m.error) toast('Menu indisponible : ' + m.error.message, 'error')
      else setMenu(m.data || [])
      if (tb.data) setTables(tb.data)
      if (cr.data) setCats(cr.data)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [sb])

  /* ---------------- table de départ ----------------
     QR scanné  -> la table du QR (on est assis devant)
     sinon      -> la dernière table utilisée sur ce téléphone
     sinon      -> on demande de choisir                                   */
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      let start = ''
      try {
        start = localStorage.getItem(TABLE_KEY) || ''
      } catch {}

      if (k) {
        const { data: info } = await sb.rpc('client_table_info', { p_token: k })
        if (!alive) return
        if (info) {
          setQrCode(info.code)
          start = info.code
        }
      } else if (sessionToken) {
        // QR de session signé : le serveur seul sait quelle table il désigne
        try {
          const r = await fetch('/api/table/session?s=' + encodeURIComponent(sessionToken))
          const d = await r.json()
          if (!alive) return
          if (d?.ok && d.table) start = d.table
          else toast(d?.message || 'QR expiré : choisissez votre table', 'error')
        } catch {
          /* hors ligne : on retombe sur le choix manuel */
        }
      } else if (t) {
        start = t
        setQrCode(t)
      }

      setCode(start)
      if (!start) setPicker(true)
    })()
    return () => {
      alive = false
    }
    // `sessionToken` est une prop constante pour la durée de vie de la page :
    // inutile de relancer l'effet si elle change (elle ne change pas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, k, t])

  /* ---------------- commande en cours de la table ---------------- */
  const loadOrder = useCallback(async () => {
    if (!sb || !code) return
    const useToken = Boolean(k) && code === qrCode
    const { data } = useToken
      ? await sb.rpc('client_open_order', { p_token: k })
      : await sb.rpc('client_open_order_by_table', { p_code: code })
    setOrder(normalizeOrder(data, tableLabel))
  }, [sb, code, k, qrCode, tableLabel])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  useEffect(() => {
    if (!code) return
    const id = setInterval(loadOrder, 15000)
    return () => clearInterval(id)
  }, [code, loadOrder])

  const chooseTable = c => {
    setCode(c)
    setPicker(false)
    try {
      localStorage.setItem(TABLE_KEY, c)
    } catch {}
  }

  /* ---------------- panier ---------------- */
  const addToCart = (dish, note = '') => {
    setCart(prev => {
      const key = dish.id + '|' + note
      const found = prev.find(i => i.key === key)
      if (found) return prev.map(i => (i.key === key ? { ...i, qty: Math.min(i.qty + 1, 99) } : i))
      return [...prev, { key, id: dish.id, name: dish.name, price: Number(dish.price), qty: 1, note }]
    })
    toast('Ajouté : ' + dish.name)
  }

  const changeQty = (key, delta) =>
    setCart(prev =>
      prev.map(i => (i.key === key ? { ...i, qty: Math.min(99, i.qty + delta) } : i)).filter(i => i.qty > 0)
    )

  const cartTotal = cart.reduce((a, i) => a + i.price * i.qty, 0)
  const cartCount = cart.reduce((a, i) => a + i.qty, 0)

  /* Envoi d'une entrée de la file (utilisé aussi par la synchro automatique). */
  const postOrder = useCallback(
    row =>
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(row.qr_token ? { qr_token: row.qr_token } : { table: row.table }),
          items: row.items,
          note: row.note || null,
          client_ref: row.client_ref
        })
      }),
    []
  )

  /* Retour du réseau : on vide la file d'attente. */
  useEffect(() => {
    if (!sb) return
    return startAutoSync(postOrder, r => {
      if (r.sent) {
        toast(r.sent + ' commande(s) gardée(s) envoyée(s) ✓')
        loadOrder()
      }
    })
  }, [sb, postOrder, loadOrder])

  const send = async () => {
    if (!cart.length) return toast('Choisissez au moins un plat')
    if (!code) {
      setPicker(true)
      return toast('Choisissez votre table')
    }
    setBusy(true)
    const items = cart.map(i => ({ menu_item_id: i.id, qty: i.qty, note: i.note || null }))
    const useToken = Boolean(k) && code === qrCode
    // client_ref : identifiant unique -> un renvoi ne crée jamais de doublon
    const entry = {
      client_ref: newClientRef(),
      ...(useToken ? { qr_token: k } : { table: code }),
      items,
      note: null
    }
    try {
      const res = await postOrder(entry)
      const data = await res.json().catch(() => ({}))
      setBusy(false)
      if (!res.ok) {
        return toast(
          res.status === 429
            ? data.message || 'Trop de commandes, patientez une minute.'
            : 'Refusé : ' + (data.message || 'commande refusée'),
          'error'
        )
      }
      setCart([])
      await loadOrder()
      toast('Commande envoyée en cuisine ✓')
    } catch {
      // Coupure réseau : la commande reste sur le téléphone et partira seule.
      await enqueue(entry)
      setBusy(false)
      setCart([])
      toast('Réseau coupé : commande gardée sur ce téléphone, elle partira automatiquement.')
    }
  }

  const dishes = useMemo(() => menu.filter(m => cat === 'Tous' || m.category_slug === cat), [menu, cat])

  return (
    <div className="min-h-dvh">
      <header className="bar sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className="gt flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ border: '1px solid var(--gold)', background: 'rgba(217,180,63,.08)' }}
            >
              <img src="/brand/logo.jpg" alt="Logo Café DUGOUT" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
            </span>
            <div>
              <div className="serif text-xl font-bold leading-tight">
                {BRAND.n} <span className="gt text-lg">{BRAND.ar}</span>
              </div>
              <div className="mut text-xs">{BRAND.tag}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn on" onClick={() => setPicker(true)} title="Changer de table">
              <Icon name="table" size={14} /> {tableLabel} ▾
            </button>
            <InstallButton className="btn" />
            <Link href="/login" className="btn">
              <Icon name="lock" size={14} /> Équipe
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-3 sm:p-5">
        <section className="hero" aria-label="Café DUGOUT — Le café des passionnés"><div className="liquid" aria-hidden="true"><i></i><i></i><i></i></div><svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" /><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" /></filter></defs></svg><svg className="hero-wave" viewBox="0 0 2400 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40Q150 0 300 40T600 40T900 40T1200 40T1500 40T1800 40T2100 40T2400 40V80H0Z"/></svg><svg className="hero-wave b" viewBox="0 0 2400 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40Q150 80 300 40T600 40T900 40T1200 40T1500 40T1800 40T2100 40T2400 40V80H0Z"/></svg>
          <div>
            <img className="hero-logo" src="/brand/logo.jpg" alt="Logo Café DUGOUT" width="168" height="168" />
            <h2 className="serif">Le café des passionnés</h2>
            <p>Football, bon café et bonne ambiance. Commandez depuis votre table.</p>
            <a href="#menu" className="btn gold">Voir le menu</a>
          </div>
          <img className="hero-cup" src="/brand/cup.webp" alt="Tasse de café avec éclaboussure et grains" width="601" height="599" fetchPriority="high" />
        </section>
        
        <section className="spec" id="specialites" aria-label="Nos spécialités">
          <img className="spec-beans l" src="/brand/beans.webp" alt="" aria-hidden="true" /><img className="spec-beans r" src="/brand/beans.webp" alt="" aria-hidden="true" />
          <img className="spec-title" src="/brand/coffee-title.webp" alt="Coffee" width="520" height="407" />
          <h3>Nos spécialités</h3>
          <div className="spec-grid">
            {SPEC_SLUGS.map(slug => {
              const c = cats.find(x => x.slug === slug)
              const prices = menu.filter(m => m.category_slug === slug).map(m => Number(m.price))
              return (
                <button
                  key={slug}
                  type="button"
                  className="spec-item"
                  onClick={() => {
                    setCat(slug)
                    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={safeImg(c?.icon_url) || `/brand/ico-${slug}.webp`} alt="" width="84" height="84" loading="lazy" />
                  <span>{c?.label || CATEGORIES.find(x => x.slug === slug)?.label || slug}</span>
                  {prices.length > 0 && <small>dès {M(Math.min(...prices))}</small>}
                </button>
              )
            })}
          </div>
        </section>
        <span id="menu" />

        {!code && (
          <div className="card gb mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              <b className="gt">Bienvenue !</b> Indiquez votre numéro de table pour commander.
            </span>
            <button className="btn gold" onClick={() => setPicker(true)}>
              Choisir ma table
            </button>
          </div>
        )}

        <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
          {['Tous', ...CATEGORIES.map(c => c.slug)].map(c => (
            <button key={c} onClick={() => setCat(c)} className={'btn whitespace-nowrap ' + (cat === c ? 'on' : '')}>
              {c === 'Tous' ? 'Tous' : CATEGORIES.find(x => x.slug === c)?.label || c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading ? (
              <p className="mut">Chargement du menu…</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dishes.map(m => (
                  <article key={m.id} className="card flex flex-col overflow-hidden">
                    <div
                      className="relative flex h-36 items-center justify-center text-4xl"
                      style={{ background: 'rgba(20,5,9,.4)' }}
                    >
                      {safeImg(m.image_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={safeImg(m.image_url)}
                          alt={m.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="gt opacity-70" aria-hidden="true">
                          <Icon name="plate" size={40} />
                        </span>
                      )}
                      <span
                        className="chip absolute bottom-2 right-2"
                        style={{ background: 'rgba(36,11,17,.88)', fontSize: '.8rem' }}
                      >
                        {M(m.price)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h3 className="serif font-bold leading-tight">{m.name}</h3>
                      {m.description && <p className="mut text-xs leading-snug">{m.description}</p>}
                      <div className="bd mt-auto flex items-center justify-between gap-2 border-t pt-3">
                        <button
                          className="mut text-xs font-bold underline"
                          onClick={() => {
                            setNoteDish(m)
                            setNoteText('')
                          }}
                        >
                          Note &amp; Options
                        </button>
                        <button className="btn gold" onClick={() => addToCart(m)}>
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {!dishes.length && <p className="mut">Aucun plat dans cette catégorie.</p>}
              </div>
            )}
          </div>

          <aside className="space-y-3" id="cart-anchor">
            {order && (
              <div className="card gb space-y-1 p-3 text-sm">
                <b className="serif gt">Votre commande en cours</b>
                {order.items.map(i => (
                  <div key={i.id} className="flex justify-between gap-2">
                    <span>
                      {i.qty}× {i.name}
                      {i.note && <i className="mut"> ({i.note})</i>}
                    </span>
                    <span>{M(i.qty * i.price)}</span>
                  </div>
                ))}
                <div className="bd flex justify-between border-t pt-1 font-bold">
                  <span>Total</span>
                  <span>{M(order.subtotal)}</span>
                </div>
                <div className="mut">
                  Payé {M(order.paid)} · Reste {M(order.subtotal - order.paid)} · {order.status}
                </div>
              </div>
            )}

            <div className="card space-y-2 p-3 lg:sticky lg:top-24">
              <h3 className="serif gt font-bold">Ma commande</h3>
              <button
                className="row w-full justify-between text-left"
                onClick={() => setPicker(true)}
                title="Changer de table"
              >
                <span className="mut text-sm">Ma table</span>
                <b className="gt">{tableLabel} ▾</b>
              </button>

              {cart.length === 0 && <p className="mut text-sm">Appuyez sur « + Ajouter » pour choisir un plat.</p>}
              {cart.map(i => (
                <div key={i.key} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    {i.name}
                    {i.note && <span className="mut block text-xs">{i.note}</span>}
                  </span>
                  <button className="btn sm" onClick={() => changeQty(i.key, -1)} aria-label="Retirer">
                    −
                  </button>
                  <b className="w-5 text-center">{i.qty}</b>
                  <button className="btn sm" onClick={() => changeQty(i.key, 1)} aria-label="Ajouter">
                    +
                  </button>
                </div>
              ))}

              <div className="bd flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span className="gt">{M(cartTotal)}</span>
              </div>
              <button className="btn gold w-full" onClick={send} disabled={busy}>
                {busy ? 'Envoi…' : order ? 'Ajouter à ma commande' : 'Envoyer la commande'}
              </button>
              <p className="mut text-[.7rem] leading-snug">
                Les prix sont relus en base au moment de l’envoi : impossible de payer moins cher que le menu.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {cartCount > 0 && (
        <button
          className="btn gold fixed right-4 z-30 shadow-lg lg:hidden"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          onClick={() => document.getElementById('cart-anchor')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Ma commande ({cartCount}) · {M(cartTotal)}
        </button>
      )}

      {picker && (
        <TablePicker
          tables={tables}
          current={code}
          qrCode={qrCode}
          onPick={chooseTable}
          onClose={code ? () => setPicker(false) : null}
        />
      )}

      {noteDish && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
          style={{ background: 'rgba(15,3,7,.55)', backdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="card pop w-full max-w-sm p-4">
            <h3 className="serif text-lg font-bold">{noteDish.name}</h3>
            <p className="mut mb-3 text-xs">Précisez vos préférences pour ce plat.</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {['Sans oignon', 'Sans piment', 'Bien cuit', 'Sauce à part'].map(o => (
                <button key={o} className="chip" onClick={() => setNoteText(v => (v ? v + ', ' : '') + o)}>
                  {o}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              className="inp mb-3"
              placeholder="Ex. : peu de sel…"
              value={noteText}
              maxLength={200}
              onChange={e => setNoteText(e.target.value)}
            />
            <button
              className="btn gold w-full"
              onClick={() => {
                addToCart(noteDish, noteText.trim())
                setNoteDish(null)
              }}
            >
              + Ajouter avec cette note
            </button>
            <button className="btn mt-2 w-full" onClick={() => setNoteDish(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Choix de la table ---------------- */
function TablePicker({ tables, current, qrCode, onPick, onClose }) {
  const numbered = tables.filter(x => x.code !== 'EMP')
  const emporter = tables.find(x => x.code === 'EMP')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: 'rgba(15,3,7,.6)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Choix de la table"
    >
      <div className="card pop w-full max-w-md p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="serif text-lg font-bold">Quelle est votre table ?</h3>
            <p className="mut text-xs">Choisissez le numéro inscrit sur votre table.</p>
          </div>
          {onClose && (
            <button className="btn sm" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          )}
        </div>

        <div className="grid max-h-[52vh] grid-cols-4 gap-2 overflow-auto pr-1">
          {numbered.map(x => (
            <button
              key={x.code}
              onClick={() => onPick(x.code)}
              className={'btn justify-center ' + (current === x.code ? 'on' : '')}
              style={{ height: 46 }}
            >
              {x.label.replace(/^Table\s*/i, '')}
            </button>
          ))}
        </div>

        {emporter && (
          <button
            className={'btn mt-3 w-full ' + (current === emporter.code ? 'on' : '')}
            onClick={() => onPick(emporter.code)}
          >
            <Icon name="box" size={14} /> {emporter.label}
          </button>
        )}

        <p className="mut mt-3 text-[.7rem] leading-snug">
          {qrCode
            ? 'Le QR code de votre table a été reconnu — vous pouvez quand même corriger le numéro.'
            : 'Votre choix est mémorisé sur ce téléphone pour les prochaines commandes.'}
        </p>
      </div>
    </div>
  )
}
