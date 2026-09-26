import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getCallerProfile, generateTempPassword, usernameToEmail } from './_supabaseAdmin.js';

// Gestion des comptes staff (création, modification, suppression,
// réinitialisation de mot de passe). Utilise la clé service_role
// (jamais exposée au navigateur) et vérifie systématiquement, via le
// token de session envoyé par le client, que l'appelant est bien
// authentifié et a le rôle requis AVANT toute écriture. C'est le seul
// chemin d'écriture sur public.profiles / auth.users : la table
// profiles n'a aucune policy RLS d'écriture côté client.

type Role = 'caissier' | 'gerant';

interface CreatePayload {
  action: 'create';
  username: string;
  name: string;
  email: string;
  role: Role;
  gender?: 'femme' | 'homme';
  department?: string;
  phone?: string;
  avatar?: string;
  password?: string;
}

interface UpdatePayload {
  action: 'update';
  username: string;
  updates: Partial<{
    username: string;
    name: string;
    email: string;
    role: Role;
    gender: 'femme' | 'homme';
    department: string | null;
    phone: string;
    avatar: string;
    locked: boolean;
  }>;
}

interface DeletePayload {
  action: 'delete';
  username: string;
}

interface ResetPasswordPayload {
  action: 'resetPassword';
  username: string;
  password?: string;
}

interface ChangeOwnPasswordPayload {
  action: 'changeOwnPassword';
  newPassword: string;
}

type Payload = CreatePayload | UpdatePayload | DeletePayload | ResetPasswordPayload | ChangeOwnPasswordPayload;

const sanitizeUsername = (raw: string): string => raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée.' });
    return;
  }

  let caller;
  try {
    caller = await getCallerProfile(req.headers.authorization);
  } catch (err) {
    console.error('admin-users config error:', err);
    res.status(500).json({ error: 'Erreur de configuration serveur.' });
    return;
  }

  if (!caller) {
    res.status(401).json({ error: 'Session invalide ou expirée. Reconnectez-vous.' });
    return;
  }

  const body = (req.body || {}) as Payload;
  const admin = getSupabaseAdmin();

  try {
    switch (body.action) {
      case 'create': {
        if (caller.role !== 'gerant') {
          res.status(403).json({ error: 'Seule la gérante peut créer un compte.' });
          return;
        }
        const username = sanitizeUsername(body.username || '');
        const name = (body.name || '').trim();
        const rawEmail = (body.email || '').trim().toLowerCase();
        if (!username || !name) {
          res.status(400).json({ error: "Identifiant et nom complet requis." });
          return;
        }
        if (rawEmail && !rawEmail.includes('@')) {
          res.status(400).json({ error: 'Adresse e-mail invalide.' });
          return;
        }
        // Pas d'e-mail réel fourni : e-mail synthétique interne, invisible pour
        // la caissière (elle se connecte toujours avec son identifiant).
        const email = rawEmail || usernameToEmail(username);
        if (body.role !== 'caissier' && body.role !== 'gerant') {
          res.status(400).json({ error: 'Rôle invalide.' });
          return;
        }
        const customPassword = (body.password || '').trim();
        if (customPassword && customPassword.length < 6) {
          res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
          return;
        }

        const { data: existing } = await admin
          .from('profiles')
          .select('id')
          .or(`username.eq.${username},email.eq.${email}`)
          .maybeSingle();
        if (existing) {
          res.status(409).json({ error: `L'identifiant ou l'e-mail est déjà utilisé.` });
          return;
        }

        // La gérante peut choisir le mot de passe elle-même ; sinon un
        // mot de passe temporaire aléatoire est généré.
        const tempPassword = customPassword || generateTempPassword();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { username },
        });
        if (createErr || !created?.user) {
          console.error('admin-users create error:', createErr);
          res.status(500).json({ error: "Impossible de créer le compte. Réessayez." });
          return;
        }

        const { error: profileErr } = await admin.from('profiles').insert({
          id: created.user.id,
          username,
          name,
          email,
          role: body.role,
          gender: body.gender || null,
          department: body.department || null,
          avatar: body.avatar || null,
          phone: body.phone || null,
          must_change_password: true,
        });
        if (profileErr) {
          // Nettoyage : on ne laisse pas un compte Auth orphelin sans profil
          await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
          console.error('admin-users profile insert error:', profileErr);
          res.status(500).json({ error: "Impossible de créer le profil. Réessayez." });
          return;
        }

        res.status(200).json({ success: true, username, tempPassword });
        return;
      }

      case 'update': {
        const username = sanitizeUsername(body.username || '');
        if (!username) {
          res.status(400).json({ error: 'Identifiant manquant.' });
          return;
        }
        const isSelf = username === caller.username;
        if (caller.role !== 'gerant' && !isSelf) {
          res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre profil.' });
          return;
        }

        const updates: Record<string, unknown> = {};
        if (caller.role === 'gerant') {
          // La gérante peut tout modifier sauf le rôle du dernier compte gérant
          if (body.updates.username !== undefined) {
            const newUsername = sanitizeUsername(body.updates.username);
            if (!newUsername) {
              res.status(400).json({ error: 'Identifiant invalide.' });
              return;
            }
            updates.username = newUsername;
          }
          if (body.updates.name !== undefined) updates.name = body.updates.name.trim();
          if (body.updates.email !== undefined) updates.email = body.updates.email.trim().toLowerCase();
          if (body.updates.role !== undefined) updates.role = body.updates.role;
          if (body.updates.gender !== undefined) updates.gender = body.updates.gender;
          if (body.updates.department !== undefined) updates.department = body.updates.department;
          if (body.updates.locked !== undefined) updates.locked = body.updates.locked;
          if (body.updates.phone !== undefined) updates.phone = body.updates.phone;
          if (body.updates.avatar !== undefined) updates.avatar = body.updates.avatar;
        } else {
          // Une caissière ne peut modifier que ses propres coordonnées, jamais son rôle
          if (body.updates.email !== undefined) updates.email = body.updates.email.trim().toLowerCase();
          if (body.updates.phone !== undefined) updates.phone = body.updates.phone;
          if (body.updates.avatar !== undefined) updates.avatar = body.updates.avatar;
        }

        if (updates.role && updates.role !== 'gerant') {
          const { count } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'gerant');
          const { data: target } = await admin.from('profiles').select('role').eq('username', username).maybeSingle();
          if (target?.role === 'gerant' && (count || 0) <= 1) {
            res.status(400).json({ error: 'Impossible de retirer le rôle du dernier compte gérant.' });
            return;
          }
        }

        if (Object.keys(updates).length === 0) {
          res.status(400).json({ error: 'Aucune modification valide.' });
          return;
        }

        // Renommage de l'identifiant : vérifie qu'il est libre, et fait
        // suivre l'e-mail interne synthétique s'il n'a jamais été
        // personnalisé (sinon il reste tel quel).
        if (typeof updates.username === 'string' && updates.username !== username) {
          const newUsername = updates.username;
          const { data: clash } = await admin.from('profiles').select('id').eq('username', newUsername).maybeSingle();
          if (clash) {
            res.status(409).json({ error: 'Cet identifiant est déjà utilisé.' });
            return;
          }
          if (updates.email === undefined) {
            const { data: current } = await admin.from('profiles').select('email').eq('username', username).maybeSingle();
            if (current?.email === usernameToEmail(username)) {
              updates.email = usernameToEmail(newUsername);
            }
          }
        }

        // L'e-mail est aussi l'identifiant Supabase Auth : les deux doivent
        // rester synchronisés, sinon la connexion utiliserait un e-mail
        // qui ne correspond plus au compte Auth réel.
        if (typeof updates.email === 'string') {
          if (updates.email && !updates.email.includes('@')) {
            res.status(400).json({ error: 'Adresse e-mail invalide.' });
            return;
          }
          // Champ vidé : retombe sur l'e-mail synthétique interne (pas d'e-mail
          // réel requis), invisible pour la caissière.
          const finalEmail = updates.email || usernameToEmail(username);
          updates.email = finalEmail;
          const { data: target } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
          if (!target) {
            res.status(404).json({ error: 'Compte introuvable.' });
            return;
          }
          const { error: emailErr } = await admin.auth.admin.updateUserById(target.id, {
            email: finalEmail,
            email_confirm: true,
            user_metadata: { username: (updates.username as string) || username },
          });
          if (emailErr) {
            console.error('admin-users email sync error:', emailErr);
            res.status(500).json({ error: "Impossible de mettre à jour l'e-mail (peut-être déjà utilisé)." });
            return;
          }
        }

        updates.updated_at = new Date().toISOString();
        const { error: updateErr } = await admin.from('profiles').update(updates).eq('username', username);
        if (updateErr) {
          console.error('admin-users update error:', updateErr);
          res.status(500).json({ error: 'Impossible de mettre à jour le profil.' });
          return;
        }

        res.status(200).json({ success: true });
        return;
      }

      case 'delete': {
        if (caller.role !== 'gerant') {
          res.status(403).json({ error: 'Seule la gérante peut supprimer un compte.' });
          return;
        }
        const username = sanitizeUsername(body.username || '');
        if (!username) {
          res.status(400).json({ error: 'Identifiant manquant.' });
          return;
        }
        if (username === caller.username) {
          res.status(400).json({ error: 'Impossible de supprimer votre propre compte depuis cet écran.' });
          return;
        }

        const { data: target } = await admin.from('profiles').select('id, role').eq('username', username).maybeSingle();
        if (!target) {
          res.status(404).json({ error: 'Compte introuvable.' });
          return;
        }
        if (target.role === 'gerant') {
          const { count } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'gerant');
          if ((count || 0) <= 1) {
            res.status(400).json({ error: 'Impossible de supprimer le dernier compte gérant.' });
            return;
          }
        }

        const { error: deleteErr } = await admin.auth.admin.deleteUser(target.id);
        if (deleteErr) {
          console.error('admin-users delete error:', deleteErr);
          res.status(500).json({ error: 'Impossible de supprimer le compte.' });
          return;
        }
        // La ligne profiles est supprimée automatiquement (ON DELETE CASCADE)

        res.status(200).json({ success: true });
        return;
      }

      case 'resetPassword': {
        if (caller.role !== 'gerant') {
          res.status(403).json({ error: 'Seule la gérante peut réinitialiser un mot de passe.' });
          return;
        }
        const username = sanitizeUsername(body.username || '');
        if (!username) {
          res.status(400).json({ error: 'Identifiant manquant.' });
          return;
        }

        const customResetPassword = (body.password || '').trim();
        if (customResetPassword && customResetPassword.length < 6) {
          res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
          return;
        }

        const { data: target } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
        if (!target) {
          res.status(404).json({ error: 'Compte introuvable.' });
          return;
        }

        const tempPassword = customResetPassword || generateTempPassword();
        const { error: pwErr } = await admin.auth.admin.updateUserById(target.id, { password: tempPassword });
        if (pwErr) {
          console.error('admin-users resetPassword error:', pwErr);
          res.status(500).json({ error: 'Impossible de réinitialiser le mot de passe.' });
          return;
        }
        await admin
          .from('profiles')
          .update({ must_change_password: true, updated_at: new Date().toISOString() })
          .eq('id', target.id);

        res.status(200).json({ success: true, tempPassword });
        return;
      }

      case 'changeOwnPassword': {
        const newPassword = body.newPassword || '';
        if (newPassword.length < 6) {
          res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
          return;
        }

        const { error: pwErr } = await admin.auth.admin.updateUserById(caller.id, { password: newPassword });
        if (pwErr) {
          console.error('admin-users changeOwnPassword error:', pwErr);
          res.status(500).json({ error: 'Impossible de changer le mot de passe.' });
          return;
        }
        await admin
          .from('profiles')
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq('id', caller.id);

        res.status(200).json({ success: true });
        return;
      }

      default:
        res.status(400).json({ error: 'Action inconnue.' });
    }
  } catch (err) {
    console.error('admin-users unexpected error:', err);
    res.status(500).json({ error: 'Erreur inattendue. Réessayez.' });
  }
}
