/**
 * GET /api/stats — synthèse du jour. ADMIN UNIQUEMENT.
 *
 * Illustration du RBAC côté API :
 *   - pas de session      -> 401
 *   - serveur / cuisine   -> 403 (le rôle est relu en BASE, pas dans un cookie)
 *   - admin               -> 200
 *
 * Défense en profondeur : même si quelqu'un trouvait cette URL, la requête
 * Supabase est faite avec la session de l'utilisateur (RLS active) ; un serveur
 * n'obtiendrait de toute façon que ses propres lignes. Le contrôle ici évite
 * simplement de exposer le calcul et de faire travailler la base pour rien.
 */
import { guardApi } from '@/lib/security/rbac'
import { supabaseServer } from '@/lib/supabase/server'
import { json } from '@/lib/security/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await guardApi('stats:read')
  if (denied) return denied

  const sb = supabaseServer()
  if (!sb) return json({ error: 'not_configured' }, 503)

  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { data, error } = await sb
    .from('v_orders_full')
    .select('id,status,subtotal,paid,opened_at')
    .gte('opened_at', since.toISOString())
    .limit(1000)

  if (error) return json({ error: 'stats_unavailable', message: error.message }, 400)

  const rows = data || []
  const revenue = rows.reduce((a, o) => a + Number(o.paid || 0), 0)
  const due = rows.reduce((a, o) => a + Math.max(0, Number(o.subtotal || 0) - Number(o.paid || 0)), 0)

  return json({
    ok: true,
    stats: {
      date: since.toISOString().slice(0, 10),
      orders: rows.length,
      open: rows.filter(o => o.status !== 'annule').length,
      revenue,
      due
    }
  })
}
