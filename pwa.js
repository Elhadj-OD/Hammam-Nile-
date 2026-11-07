'use client'

// Petit magasin partagé pour l'invite d'installation PWA (beforeinstallprompt).

let deferredPrompt = null
const subscribers = new Set()

export function setInstallPrompt(event) {
  deferredPrompt = event
  subscribers.forEach(fn => fn(deferredPrompt))
}

export function subscribeInstall(fn) {
  subscribers.add(fn)
  fn(deferredPrompt)
  return () => subscribers.delete(fn)
}

export async function promptInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }))
  deferredPrompt = null
  subscribers.forEach(fn => fn(null))
  return choice.outcome === 'accepted'
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}
