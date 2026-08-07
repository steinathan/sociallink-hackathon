import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { collection, doc, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export const firestoreNamespace =
  process.env.NEXT_PUBLIC_FIREBASE_NAMESPACE?.trim().replace(/^\/+|\/+$/g, "") ||
  "sociallink";

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

export function getFirebaseApp() {
  if (!hasFirebaseConfig) {
    return null;
  }

  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export function getFirebaseServices() {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

function getScopedPath(...segments: string[]) {
  return ["stores", firestoreNamespace, ...segments] as const;
}

export function getScopedCollectionRef(db: Firestore, ...segments: string[]) {
  return collection(db, ...getScopedPath(...segments));
}

export function getScopedDocRef(db: Firestore, ...segments: string[]) {
  return doc(db, ...getScopedPath(...segments));
}

const resolvedApp = getFirebaseApp();
if (!resolvedApp) {
  throw new Error(
    "Missing Firebase client configuration. Check NEXT_PUBLIC_FIREBASE_* environment variables."
  );
}
const firebaseApp = resolvedApp;

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Lazily return a Messaging instance only in environments that support it
// (browser with Service Worker support). Returns null on SSR or in unsupported browsers.
export async function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(firebaseApp);
}

export default firebaseApp;
