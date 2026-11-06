/**
 * Validation des entrées (Zod) — barrière avant toute logique métier.
 *
 * Règle d'or : les schémas sont `.strict()`.
 * Tout champ inconnu (ex. `price`, `unit_price`, `status`, `table_id`)
 * est REJETÉ avec une 400. Un client ne peut donc pas « glisser » un prix
 * ou un statut dans le payload : ces valeurs n'existent pas dans le modèle.
 *
 * Les prix, totaux et statuts viennent uniquement de la base (fonctions SQL
 * `security definer`), jamais du navigateur.
 */
import { z } from 'zod'

/** Codes de table acceptés : T01 … T20 + EMP (à emporter). */
export const tableCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(T(0[1-9]|1[0-9]|20)|EMP)$/, 'Code table invalide')

/** Un item de commande : identifiant de produit + quantité + note libre. */
export const orderItem = z
  .object({
    menu_item_id: z.string().uuid('Identifiant produit invalide'),
    qty: z.number().int().min(1, 'Quantité minimum 1').max(20, 'Quantité maximum 20'),
    note: z.string().trim().max(140, 'Note trop longue (140 caractères)').nullish()
  })
  .strict()

/**
 * Commande client.
 * - soit un jeton QR (`qr_token`), soit un code de table (`table`) : pas les deux.
 * - `client_ref` : UUID généré par le téléphone, sert d'idempotence
 *   (un double envoi après coupure réseau ne crée pas deux commandes).
 * - Aucun prix : `.strict()` rejette `price`, `total`, etc.
 */
export const orderSchema = z
  .object({
    table: tableCode.optional(),
    qr_token: z.string().trim().min(8).max(64).optional(),
    items: z.array(orderItem).min(1, 'Panier vide').max(30, 'Trop d’articles'),
    note: z.string().trim().max(200).nullish(),
    client_ref: z.string().uuid('Référence client invalide')
  })
  .strict()
  .refine(v => Boolean(v.table) !== Boolean(v.qr_token), {
    message: 'Fournir soit une table, soit un jeton QR'
  })

/** Connexion équipe (la vraie vérification reste faite par Supabase Auth). */
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Email invalide').max(160),
    password: z.string().min(8, 'Mot de passe trop court').max(72) // bcrypt : 72 octets max
  })
  .strict()

/** Webhook de paiement, partie commune à tous les opérateurs. */
export const webhookSchema = z
  .object({
    event_id: z.string().trim().min(1).max(120),
    reference: z.string().trim().min(1).max(120),
    amount: z.number().nonnegative().max(1_000_000),
    currency: z.string().trim().max(8).default('MRU'),
    status: z.enum(['paid', 'failed', 'pending', 'refunded'])
  })
  .passthrough() // le payload brut est conservé pour l'audit

/** Jeton de session de table (?s=… dans l'URL du QR). */
export const tableToken = z.string().regex(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'Jeton table invalide')

/** Aide : formate les erreurs Zod sans exposer les détails internes. */
export function zodError(err) {
  const first = err?.issues?.[0]
  return {
    error: 'validation_error',
    message: first ? `${first.path.join('.') || 'données'} : ${first.message}` : 'Données invalides'
  }
}
