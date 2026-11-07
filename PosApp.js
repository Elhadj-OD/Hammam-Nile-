'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/Icon'
import { BRAND, CLIENT_ORDERING, ROLE_LABEL, TABS, can } from '@/lib/config'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { usePos } from './PosProvider'
import NewOrderTab from './NewOrderTab'
import OrdersTab from './OrdersTab'
import KdsTab from './KdsTab'
import HistoryTab from './HistoryTab'
import StatsTab from './StatsTab'
import MenuTab from './MenuTab'
import QrTab from './QrTab'
import StockTab from './StockTab'

const ICONS = { new: 'plate', orders: 'chef', kds: 'flame', hist: 'clock', stats: 'chart', menu: 'box', qr: 'qr', stock: 'box' }

export default function PosApp({ onBackToMenu }) {
  const { staff, orders, menu, loading, error, refresh } = usePos()
  const [tab, setTab] = useState('orders')
  const [busy, setBusy] = useState(false)
  const openCount = orders.filter(o => !o.closed && o.st !== 'Annulé').length

  const logout = async () => {
    setBusy(true)
    await supabaseBrowser()?.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-dvh">
      <header className="bar sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="gt flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ border: '1px solid var(--gold)', background: 'rgba(217,180,63,.08)' }}
              aria-label="Retour au menu client"
            >
              <img src="/brand/logo.jpg" alt="Logo Café DUGOUT" width={44} height={44} className="h-11 w-11 rounded-xl object-contain" />
            </Link>
            <div>
              <div className="serif text-xl font-bold leading-tight">
                {BRAND.n} <span className="gt text-lg">{BRAND.ar}</span>
              </div>
              <div className="mut text-xs">
                ● {ROLE_LABEL[staff?.role] || 'Équipe'} · {staff?.full_name || ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={refresh} aria-label="Rafraîchir">
              <Icon name="clock" size={14} /> Actualiser
            </button>
            <button className="btn red" onClick={logout} disabled={busy}>
              <Icon name="lock" size={14} /> Verrouiller
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-3 sm:p-5">
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-2 p-2">
          <div className="flex flex-wrap gap-2">
            {/* Moindre privilège : on n'affiche QUE les onglets autorisés.
                (Les données restent de toute façon protégées par la RLS :
                 cacher l'onglet est un confort, pas la sécurité.) */}
            {TABS.filter(t => can(staff?.role, t.level) && (t.key !== 'qr' || CLIENT_ORDERING)).map(t => (
              <button
                key={t.key}
                className={'btn ' + (tab === t.key ? 'on' : '')}
                onClick={() => setTab(t.key)}
                title={t.label}
              >
                <Icon name={ICONS[t.key]} size={15} /> {t.label}
                {t.key === 'orders' && openCount ? ` (${openCount})` : ''}
                {t.key === 'menu' ? ` (${menu.length})` : ''}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card mb-4 p-3 text-sm" style={{ borderColor: 'rgba(255,90,90,.5)' }}>
            Erreur de lecture : {error}
          </div>
        )}
        {loading && <p className="mut">Chargement des commandes…</p>}

        {tab === 'new' && can(staff?.role, 'o') && <NewOrderTab onDone={() => setTab('orders')} />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'kds' && <KdsTab />}
        {tab === 'hist' && <HistoryTab />}
        {tab === 'stats' && can(staff?.role, 'a') && <StatsTab />}
        {tab === 'menu' && can(staff?.role, 'a') && <MenuTab />}
        {tab === 'stock' && can(staff?.role, 'm') && <StockTab />}
        {tab === 'qr' && can(staff?.role, 'a') && <QrTab />}

        {onBackToMenu && (
          <button className="btn mt-4" onClick={onBackToMenu}>
            <Icon name="back" size={14} /> Retour au menu client
          </button>
        )}
      </main>
    </div>
  )
}
