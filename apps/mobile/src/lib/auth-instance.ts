import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/** Web (vista previa): persistencia por defecto del navegador. */
export const createAuth = (app: FirebaseApp) => getAuth(app);
