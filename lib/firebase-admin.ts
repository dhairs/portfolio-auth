import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initializeAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        const cleanPrivateKey = privateKey
          .replace(/\\n/g, "\n")
          .replace(/^['"]|['"]$/g, "");

        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: cleanPrivateKey,
          }),
        });
        console.log("Firebase Admin SDK initialized successfully in portfolio-auth.");
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
      }
    }
  }
}

export function getAdminAuth() {
  initializeAdmin();
  if (getApps().length === 0) {
    throw new Error(
      "Firebase Admin SDK cannot be retrieved because credentials are not configured in your environment variables."
    );
  }
  return getAuth();
}

export function getAdminDb() {
  initializeAdmin();
  if (getApps().length === 0) {
    throw new Error(
      "Firebase Admin SDK cannot be retrieved because credentials are not configured in your environment variables."
    );
  }
  return getFirestore();
}
