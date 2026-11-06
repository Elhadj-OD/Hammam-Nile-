import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from '@/lib/config'

/** Client Supabase côté serveur (Server Components / Server Actions), basé sur les cookies. */
export function supabaseServer() {
  if (!isConfigured()) return null
  const cookieStore = cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // appelé depuis un Server Component en lecture seule : le middleware rafraîchit la session
        }
      }
    }
  })
}

/** Utilisateur connecté + sa ligne public.staff (rôle). RLS : chacun ne lit que sa ligne. */
export async function getProfile() {
  const sb = supabaseServer()
  if (!sb) return { user: null, staff: null }
  const {
    data: { user }
  } = await sb.auth.getUser()
  if (!user) return { user: null, staff: null }
  const { data } = await sb
    .from('staff')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle()
  return { user, staff: data && data.is_active ? data : null }
}
