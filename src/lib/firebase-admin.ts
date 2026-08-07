import * as admin from "firebase-admin";

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log("[FirebaseAdmin] Initialized successfully");
  } catch (error) {
    console.error("[FirebaseAdmin] Initialization error:", error);
  }
}

export const firestoreNamespace =
  process.env.FIREBASE_NAMESPACE?.trim().replace(/^\/+|\/+$/g, "") ||
  process.env.NEXT_PUBLIC_FIREBASE_NAMESPACE?.trim().replace(/^\/+|\/+$/g, "") ||
  "sociallink";

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
export const adminMessaging = admin.messaging();

function getScopedPath(...segments: string[]) {
  return ["stores", firestoreNamespace, ...segments].join("/");
}

export function adminCollection(collectionId: string) {
  return adminDb.collection("stores").doc(firestoreNamespace).collection(collectionId);
}

export function adminDoc(...segments: string[]) {
  return adminDb.doc(getScopedPath(...segments));
}
