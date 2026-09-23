import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, usernameToEmail } from './_supabaseAdmin';

// Résout un identifiant ("sophia") vers l'e-mail Supabase Auth réel
// associé à ce compte, AVANT toute connexion — c'est-à-dire sans session,
// donc sans pouvoir lire public.profiles depuis le client (RLS réservée
// aux comptes authentifiés). Utilise la clé service_role côté serveur
// pour ce seul besoin : mapper un identifiant vers un e-mail.
//
// Ne révèle jamais si l'identifiant existe ou non : en cas d'absence de
// profil ou d'e-mail réel enregistré, retombe sur l'adresse interne
// synthétique (comportement historique), pour que la tentative de
// connexion échoue de façon identique ("identifiant ou mot de passe
// incorrect") que le compte existe ou non.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  const username = ((req.body || {}).username || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!username) {
    res.status(400).json({ error: 'Identifiant manquant.' });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from('profiles').select('email').eq('username', username).maybeSingle();
    const email = data?.email || usernameToEmail(username);
    res.status(200).json({ email });
  } catch (err) {
    console.error('resolve-login-email error:', err);
    // Ne bloque jamais la connexion à cause d'une erreur ici : on retombe
    // sur l'adresse synthétique, cohérent avec le comportement historique.
    res.status(200).json({ email: usernameToEmail(username) });
  }
}
