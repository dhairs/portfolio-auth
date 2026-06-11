import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getClientApp() {
  if (getApps().length === 0) {
    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase Client API Key is missing.");
    }
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getClientAuth() {
  return getAuth(getClientApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  // Optional: add scopes or custom parameters here if needed
  return provider;
}
