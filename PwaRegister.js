'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import { isStandalone, promptInstall, setInstallPrompt, subscribeInstall } from '@/lib/pwa'

/** Enregistre le service worker, gère l'invite d'installation et l'état hors-ligne. */
export default function PwaRegister() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // Service worker (inutile en dev : le HMR serait masqué par le cache)
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }

    const onPrompt = e => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[55] px-3 py-2 text-center text-xs font-semibold"
      style={{ background: 'rgba(190,40,50,.95)', color: '#fff', paddingBottom: 'calc(.5rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      Hors ligne — les commandes ne peuvent pas partir. Reconnectez-vous au réseau.
    </div>
  )
}

/** Bouton « Installer l'app » : visible seulement si le navigateur le propose. */
export function InstallButton({ className = 'btn' }) {
  const [available, setAvailable] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    return subscribeInstall(p => setAvailable(Boolean(p)))
  }, [])

  if (installed || !available) return null

  return (
    <button
      className={className}
      onClick={async () => {
        await promptInstall()
      }}
      title="Installer l’application sur cet appareil"
    >
      <Icon name="download" size={14} /> Installer
    </button>
  )
}
