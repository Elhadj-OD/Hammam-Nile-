'use client'

const listeners = new Set()

/** Affiche un message éphémère en haut de l'écran. */
export function toast(msg, tone = 'default') {
  listeners.forEach(fn => fn(String(msg), tone))
}

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
