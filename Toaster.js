'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeToast } from '@/lib/toast'

export default function Toaster() {
  const [msg, setMsg] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    return subscribeToast((m, tone) => {
      setMsg({ text: m, tone })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 2600)
    })
  }, [])

  if (!msg) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[4.5rem] z-[60] -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg"
      style={{
        background: msg.tone === 'error' ? 'rgba(190,40,50,.95)' : 'rgba(240,210,122,.95)',
        color: msg.tone === 'error' ? '#fff' : '#2a0f14',
        maxWidth: '92vw'
      }}
    >
      {msg.text}
    </div>
  )
}
