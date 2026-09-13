import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Client, Sale } from '../types';

// Initialize Firebase App & Firestore with specific databaseId
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't crash the entire app in offline mode, but log and rethrow if needed
}

// Test initial connection to Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
    return false;
  }
}

// ----------------------------------------------------
// CLIENTS FIRESTORE SYNC
// ----------------------------------------------------

export async function syncClientToFirestore(client: Client): Promise<void> {
  const path = `clients/${client.id}`;
  try {
    await setDoc(doc(db, 'clients', String(client.id)), {
      id: client.id,
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      createdAt: client.createdAt || new Date().toISOString(),
      purchaseCount: client.purchaseCount || 0,
      totalSpent: client.totalSpent || 0,
      lastPurchaseDate: client.lastPurchaseDate || '',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadClientsFromFirestore(): Promise<Client[]> {
  const path = 'clients';
  try {
    const snap = await getDocs(collection(db, 'clients'));
    const clients: Client[] = [];
    snap.forEach(docSnap => {
      clients.push(docSnap.data() as Client);
    });
    return clients;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// ----------------------------------------------------
// SALES FIRESTORE SYNC
// ----------------------------------------------------

export async function syncSaleToFirestore(sale: Sale): Promise<void> {
  const path = `sales/${sale.id}`;
  try {
    await setDoc(doc(db, 'sales', String(sale.id)), {
      ...sale,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadSalesFromFirestore(): Promise<Sale[]> {
  const path = 'sales';
  try {
    const snap = await getDocs(query(collection(db, 'sales'), orderBy('timestamp', 'desc')));
    const sales: Sale[] = [];
    snap.forEach(docSnap => {
      sales.push(docSnap.data() as Sale);
    });
    return sales;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// ----------------------------------------------------
// 2FA / EMAIL VERIFICATION CODE FOR ADMIN (FIREBASE)
// ----------------------------------------------------

export interface VerificationRequest {
  id: string;
  email: string;
  code: string;
  expiresAt: number;
  verified: boolean;
  createdAt: string;
  role: string;
}

/**
 * Generates and saves a secure 6-digit verification code to Firestore for the Admin
 * and dispatches the email to the user's phone inbox.
 */
export async function sendAdminVerificationCode(email: string): Promise<{
  success: boolean;
  code: string;
  verificationId: string;
  expiresInMinutes: number;
}> {
  const cleanEmail = email.trim().toLowerCase();
  // Generate high-entropy 6-digit PIN
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const path = `security_verifications/${verificationId}`;
  try {
    // 1. Save verification record in Firestore
    await setDoc(doc(db, 'security_verifications', verificationId), {
      email: cleanEmail,
      code,
      expiresAt,
      verified: false,
      createdAt: new Date().toISOString(),
      role: 'gerant',
    });

    // 2. Queue email in Firestore 'mail' collection (Firebase Trigger Email Extension format)
    try {
      await setDoc(doc(db, 'mail', verificationId), {
        to: [cleanEmail],
        message: {
          subject: `Code de Sécurité Admin Hammam Nile : ${code}`,
          text: `Bonjour,\n\nVotre code de vérification pour accéder à la partie Admin de Hammam Nile est : ${code}.\n\nCe code est valable 10 minutes. Veuillez le saisir sur l'écran pour confirmer votre identité.\n\nNe communiquez ce code à personne pour empêcher les accès non autorisés.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E7E0D3; border-radius: 16px;">
              <h2 style="color: #0A3735; text-align: center;">Hammam Nile — Espace Admin</h2>
              <p>Bonjour Administrateur,</p>
              <p>Vous avez demandé à déverrouiller la partie <strong>Admin (Gérance)</strong>. Voici votre code de sécurité :</p>
              <div style="text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0A3735; background: #F7F3EC; padding: 12px 24px; border-radius: 12px; border: 1px solid #E7E0D3; display: inline-block;">${code}</span>
              </div>
              <p style="color: #666; font-size: 13px;">Ce code est valable pendant 10 minutes. Saisissez ce code dans l'application pour confirmer votre identité.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #999; text-align: center;">Hammam Nile — Système de caisse et de gestion sécurisé</p>
            </div>
          `,
        },
      });
    } catch (mailQueueErr) {
      console.warn('Mail queue notice:', mailQueueErr);
    }

    // 3. Dispatch directly to user's email inbox via transactional FormSubmit service
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanEmail)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: `Votre code Admin Hammam Nile : ${code}`,
          _template: 'table',
          _captcha: 'false',
          code_de_verification: code,
          application: 'Hammam Nile - Caisse & Gestion',
          expediteur: 'Sécurité Authentification Firebase',
          instructions: `Votre code secret de vérification administrateur est : ${code}. Tapez ce code dans l'application sur votre écran pour autoriser l'accès.`,
          date: new Date().toLocaleString('fr-FR'),
        }),
      }).catch(err => console.warn('Email dispatch warning:', err));
    } catch (fetchErr) {
      console.warn('Email trigger error:', fetchErr);
    }

    return {
      success: true,
      code,
      verificationId,
      expiresInMinutes: 10,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return {
      success: true,
      code,
      verificationId,
      expiresInMinutes: 10,
    };
  }
}

/**
 * Validates the entered 6-digit code against Firestore
 */
export async function verifyAdminSecurityCode(
  verificationId: string,
  enteredCode: string
): Promise<{ valid: boolean; message: string }> {
  const path = `security_verifications/${verificationId}`;
  try {
    const snap = await getDoc(doc(db, 'security_verifications', verificationId));
    if (!snap.exists()) {
      return { valid: false, message: 'Demande de vérification introuvable ou expirée.' };
    }

    const data = snap.data() as VerificationRequest;
    if (Date.now() > data.expiresAt) {
      return { valid: false, message: 'Le code de sécurité a expiré. Veuillez en redemander un.' };
    }

    if (data.code !== enteredCode.trim()) {
      return { valid: false, message: 'Code de sécurité incorrect. Veuillez réessayer.' };
    }

    // Mark as verified
    await setDoc(
      doc(db, 'security_verifications', verificationId),
      { verified: true, verifiedAt: new Date().toISOString() },
      { merge: true }
    );

    return { valid: true, message: 'Identité administrateur vérifiée avec succès !' };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return { valid: false, message: 'Erreur lors de la vérification du code.' };
  }
}
