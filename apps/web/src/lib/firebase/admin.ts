import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env, isFirebaseAdminConfigured } from '@/lib/env';

let app: App | null = null;

function credentials() {
  if (env.firebaseAdmin.serviceAccountB64) {
    const json = JSON.parse(Buffer.from(env.firebaseAdmin.serviceAccountB64, 'base64').toString('utf8'));
    return cert({ projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key });
  }
  return cert({
    projectId: env.firebaseAdmin.projectId!,
    clientEmail: env.firebaseAdmin.clientEmail!,
    privateKey: env.firebaseAdmin.privateKey!,
  });
}

export function adminAuth() {
  if (!isFirebaseAdminConfigured()) throw new Error('Firebase Admin no está configurado');
  if (!app) app = getApps()[0] ?? initializeApp({ credential: credentials() });
  return getAuth(app);
}
