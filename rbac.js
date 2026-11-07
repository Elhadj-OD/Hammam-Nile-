/**
 * Contrôle d'accès basé sur les rôles (RBAC).
 *
 * Trois profils :
 *   client  -> aucune session, peut seulement lire le menu et créer une commande
 *   serveur / cuisine / gerant -> espace équipe, périmètre limité
 *   admin   -> tout (statistiques, menu, QR, gestion du staff)
 *
 * Deux points d'application INDISPENSABLES (défense en profondeur) :
 *   1. ICI : middleware / Server Component / route handler -> l'UI et l'API.
 *   2. EN BASE : RLS + GRANT + vérification `public.staff(role)` dans chaque
 *      fonction SQL. Même en contournant l'app (curl direct sur Supabase),
 *      l'accès est refusé. Voir supabase/1_schema.sql et 4_security_hardening.sql.
 *
 * Un rôle lu côté navigateur n'a AUCUNE valeur : il est toujours relu en base.
 */
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/server'
import { json } from './http'

/** Rôles connus, du plus large au plus étroit. */
export const ROLES = ['admin', 'gerant', 'serveur', 'cuisine']

/**
 * Matrice des permissions. Une seule source de vérité, lisible et testable :
 * `can('serveur', 'payment:create') === true`, `can('cuisine', 'stats:read') === false`.
 */
export const PERMISSIONS = {
  'orders:read': ['admin', 'gerant', 'serveur', 'cuisine'],
  'orders:create': ['admin', 'gerant', 'serveur'],
  'orders:update_status': ['admin', 'gerant', 'serveur', 'cuisine'],
  'payment:create': ['admin', 'gerant', 'serveur'],
  'payment:refund': ['admin', 'gerant'],
  'stats:read': ['admin'],
  'menu:write': ['admin'],
  'qr:read': ['admin'],
  'staff:write': ['admin']
}

/** Le rôle possède-t-il la permission ? (deny by default) */
export function can(role, permission) {
  if (!role) return false
  const allowed = PERMISSIONS[permission]
  return Array.isArray(allowed) ? allowed.includes(role) : false
}

/**
 * Garde pour un Server Component / Server Action :
 * redirige vers /login si pas de session, vers /login?err=role si rôle insuffisant.
 * Renvoie le profil complet ({ user, staff }) si autorisé.
 */
export async function requirePermission(permission, { redirectTo = '/login' } = {}) {
  const { user, staff } = await getProfile()
  if (!user) redirect(`${redirectTo}?next=${encodeURIComponent(redirectTo)}`)
  const role = staff?.role
  if (!can(role, permission)) redirect('/login?err=role')
  return { user, staff, role }
}

/**
 * Garde pour une route /api : renvoie une Response d'erreur, ou null si autorisé.
 * Volontairement muet sur la raison exacte côté client (401 vs 403 seulement).
 */
export async function guardApi(permission) {
  const { user, staff } = await getProfile()
  if (!user) return json({ error: 'unauthenticated', message: 'Connexion requise' }, 401)
  const role = staff?.role
  if (!staff?.is_active) return json({ error: 'forbidden', message: 'Accès refusé' }, 403)
  if (!can(role, permission)) return json({ error: 'forbidden', message: 'Accès refusé' }, 403)
  return null
}

/** Variante explicite quand on veut la liste des rôles plutôt qu'une permission. */
export async function guardApiRoles(roles = []) {
  const { user, staff } = await getProfile()
  if (!user) return { res: json({ error: 'unauthenticated' }, 401), staff: null }
  if (!staff?.is_active || !roles.includes(staff.role)) {
    return { res: json({ error: 'forbidden', message: 'Accès refusé' }, 403), staff: null }
  }
  return { res: null, staff }
}
