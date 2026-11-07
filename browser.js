'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from '@/lib/config'

let client = null

/** Client Supabase côté navigateur (session en cookie, rafraîchie par le middleware). */
export function supabaseBrowser() {
  if (!isConfigured()) return null
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}
