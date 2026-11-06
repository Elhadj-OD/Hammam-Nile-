import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/security/rate-limit'

// Rafraîchit la session Supabase à chaque requête (cookies httpOnly).
export async function middleware(request) {
  const { pathname } = request.nextUrl

  /* ---- Garde générique sur l'API -------------------------------------
     300 requêtes/minute par IP, toutes routes /api confondues : protège
     contre le scraping et les boucles d'un client défaillant. Les limites
     fines (commande, webhook, session de table) sont posées dans chaque
     route, là où le contexte métier est connu. */
  if (pathname.startsWith('/api/')) {
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'inconnu'
    const rl = await rateLimit({ key: `api:${ip}`, limit: 300, windowMs: 60_000 })
    if (!rl.ok) {
      return new NextResponse(JSON.stringify({ error: 'rate_limited', message: 'Trop de requêtes' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) }
      })
    }
    // charge utile anormalement grosse : refusée avant lecture du corps
    const len = Number(request.headers.get('content-length') || 0)
    if (len > 100_000) {
      return new NextResponse(JSON.stringify({ error: 'payload_too_large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' }
      })
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      }
    }
  })

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
}
