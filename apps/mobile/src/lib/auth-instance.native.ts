import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

/**
 * iOS/Android: sesión persistida en AsyncStorage (Firebase JS SDK v12).
 * getReactNativePersistence solo existe en el build "react-native" de @firebase/auth (Metro lo
 * resuelve por la condición de exports); los tipos públicos no lo declaran, por eso el cast.
 */
const { getReactNativePersistence } = FirebaseAuth as unknown as { getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence };

export const createAuth = (app: FirebaseApp) => FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
