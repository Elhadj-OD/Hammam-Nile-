import { supabase, isSupabaseConfigured } from './supabase';
import { User, UserRole, UserGender, CaisseDepartment } from '../types';

// Adresse interne utilisée comme identifiant Supabase Auth (jamais réelle,
// jamais envoyée nulle part) : le staff continue de se connecter avec
// juste son "identifiant" (username). Copie volontairement dupliquée de
// api/_supabaseAdmin.ts (petite fonction pure) — ce fichier tourne dans
// le navigateur, l'autre uniquement côté serveur.
const EMAIL_DOMAIN = 'hammamnile.local';
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

interface ProfileRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  gender: UserGender | null;
  department: CaisseDepartment | null;
  locked: boolean;
  avatar: string | null;
  phone: string | null;
  must_change_password: boolean;
  created_at: string | null;
}

function profileToUser(p: ProfileRow): User {
  return {
    id: p.id,
    username: p.username,
    name: p.name,
    role: p.role,
    gender: p.gender || undefined,
    department: p.department || undefined,
    locked: p.locked,
    avatar: p.avatar || undefined,
    phone: p.phone || undefined,
    createdAt: p.created_at || undefined,
    mustChangePassword: p.must_change_password,
  };
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "La connexion au serveur n'est pas configurée." };
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
  return { success: true };
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchOwnProfile(): Promise<User | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error || !data) return null;
  return profileToUser(data as ProfileRow);
}

export async function fetchAllProfiles(): Promise<User[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as ProfileRow[]).map(profileToUser);
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function callAdminUsersApi<T = unknown>(
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string } & T> {
  const token = await getAccessToken();
  if (!token) return { success: false, error: 'Session expirée. Reconnectez-vous.' } as { success: boolean; error?: string } & T;

  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Erreur inconnue.' } as { success: boolean; error?: string } & T;
    }
    return data as { success: boolean; error?: string } & T;
  } catch {
    return { success: false, error: 'Impossible de contacter le serveur.' } as { success: boolean; error?: string } & T;
  }
}

export async function createStaffUser(data: {
  username: string;
  name: string;
  role: UserRole;
  gender?: UserGender;
  department?: CaisseDepartment;
  phone?: string;
  avatar?: string;
}): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  return callAdminUsersApi<{ tempPassword?: string }>({ action: 'create', ...data });
}

export async function updateStaffUser(
  username: string,
  updates: Partial<{
    name: string;
    role: UserRole;
    gender: UserGender;
    department: CaisseDepartment | null;
    phone: string;
    avatar: string;
    locked: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  return callAdminUsersApi({ action: 'update', username, updates });
}

export async function deleteStaffUser(username: string): Promise<{ success: boolean; error?: string }> {
  return callAdminUsersApi({ action: 'delete', username });
}

export async function resetStaffPassword(
  username: string
): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  return callAdminUsersApi<{ tempPassword?: string }>({ action: 'resetPassword', username });
}

export async function changeOwnPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  return callAdminUsersApi({ action: 'changeOwnPassword', newPassword });
}

export const isAuthConfigured = isSupabaseConfigured;
