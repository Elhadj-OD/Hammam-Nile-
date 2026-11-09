// Configuration Supabase (côté serveur ET navigateur : variables NEXT_PUBLIC_*)
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// L'app démarre quand même si ce n'est pas configuré : elle affiche alors un écran d'installation.
// (accepte aussi une URL locale type `supabase start` -> http://127.0.0.1:54321)
export function isConfigured() {
  if (!/^https?:\/\/\S+$/i.test(SUPABASE_URL)) return false
  if (SUPABASE_ANON_KEY.length < 20) return false // accepte les clés sb_publishable_… (≈46 car.) et les anciennes clés JWT
  return !/VOTRE|COLLEZ|xxxx/i.test(SUPABASE_URL + SUPABASE_ANON_KEY)
}

export const BRAND = {
  n: 'Café DUGOUT',
  ar: '',
  tag: 'Le café des passionnés • Football · Bon Café · Bonne Ambiance'
}

export const PAY_METHODS = ['Bankily', 'Masrivi', 'Sedad', 'Click', 'Espèces']

export const CATEGORIES = [
  { slug: 'petit-dejeuner', label: 'Petit déjeuner' },
  { slug: 'cascroute', label: 'Cascroute' },
  { slug: 'snack', label: 'Snack' },
  { slug: 'sucre', label: 'Salle sucrée' },
  { slug: 'boissons', label: 'Boissons' }
]

export const ROLE_LABEL = {
  admin: 'Admin',
  gerant: 'Gérant',
  serveur: 'Serveur',
  cuisine: 'Cuisine'
}

export const TABS = [
  { key: 'new', label: 'Nouvelle commande', level: 'o' },
  { key: 'orders', label: 'Commandes', level: 'g' },
  { key: 'kds', label: 'Écran Cuisine (KDS)', level: 'g' },
  { key: 'hist', label: 'Historique', level: 'g' },
  { key: 'stock', label: 'Stock Magasin', level: 'm' },
  { key: 'kstock', label: 'Stock Cuisine', level: 'k' },
  { key: 'stats', label: 'Statistiques', level: 'a' },
  { key: 'menu', label: 'Menu & Produits', level: 'a' },
  { key: 'qr', label: 'QR des tables', level: 'a' }
]

export function can(role, level) {
  if (!role) return false
  if (level === 'a') return role === 'admin'
  if (level === 'o') return role === 'admin' || role === 'gerant' || role === 'serveur' // prise de commande + encaissement
  if (level === 'k') return role === 'admin' || role === 'gerant' || role === 'cuisine' // stock cuisine
  if (level === 'm') return role === 'admin' || role === 'gerant' // magasin / inventaire
  return ['admin', 'gerant', 'serveur', 'cuisine'].includes(role)
}

// ---------- Affichage ----------
export const M = n => Number(n || 0).toLocaleString('fr-FR') + ' MRU'
export const hm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const dt = t =>
  new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + hm(t)

// ---------- Statuts ----------
export const ST_LABEL = { attente: 'Attente', pret: 'Prêt', servi: 'Servi', annule: 'Annulé' }
export const ST_CODE = { Attente: 'attente', Prêt: 'pret', Servi: 'servi', Annulé: 'annule' }
export const ST_NEXT = ['Attente', 'Prêt', 'Servi']

// ---------- Moyens de paiement ----------
export const OP_CODE = {
  Bankily: 'bankily',
  Masrivi: 'masrivi',
  Sedad: 'sedad',
  Click: 'click',
  Espèces: 'especes'
}
export const OP_LABEL = {
  bankily: 'Bankily',
  masrivi: 'Masrivi',
  sedad: 'Sedad',
  click: 'Click',
  especes: 'Espèces'
}

// ---------- Montants ----------
export const tot = o => (o?.items || []).reduce((a, i) => a + Number(i.price) * i.qty, 0)
export const paid = o => (o?.pays || []).reduce((a, p) => a + Number(p.amt), 0)
export const rest = o => Math.max(0, Math.round((tot(o) - paid(o)) * 100) / 100)
export const isClosed = o => !!o?.closed || (paid(o) >= tot(o) && o?.st === 'Servi')

// ---------- Ticket ----------
export const ticketNo = o =>
  'CD-' + (o?.no ? String(o.no).padStart(4, '0') : String(o?.id || '').replace(/-/g, '').slice(0, 6).toUpperCase())

/** Rubriques affichées en pastilles rondes en haut du menu client (icône modifiable par l'admin). */
export const SPEC_SLUGS = ['petit-dejeuner', 'cascroute', 'sucre', 'snack']

/** Commandes par les clients (QR / menu public). Désactivé : seule l'équipe prend les commandes.
 *  Pour le réactiver plus tard : NEXT_PUBLIC_CLIENT_ORDERING=1 (+ ré-autoriser les fonctions SQL client_place_order*). */
export const CLIENT_ORDERING = process.env.NEXT_PUBLIC_CLIENT_ORDERING === '1'

/** Connexion équipe par profil : mot de passe saisi tel quel (PIN_SUFFIX vide ; voir supabase/8_comptes_et_bons.sql). */
export const PIN_SUFFIX = ''
export const PIN_PROFILES = [
  { key: 'admin', label: 'Admin', email: 'admin@dugout.mr' },
  { key: 'gerant', label: 'Gérant', email: 'gerant@dugout.mr' },
  { key: 'serveur', label: 'Serveur', email: 'serveur@dugout.mr' },
  { key: 'cuisine', label: 'Cuisine', email: 'cuisine@dugout.mr' }
]
