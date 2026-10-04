import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigured = Boolean(
  rawApiKey && !rawApiKey.includes("your_firebase_api_key")
);

// Firebase configuration loaded from Vite environment variables with safe dev fallbacks
const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : "AIzaSyDummyPreviewKeyForLocalDev12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kaamfix-preview.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kaamfix-preview",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kaamfix-preview.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEF1234",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  if (isFirebaseConfigured) {
    console.log("🔥 Firebase initialized with custom project configuration.");
  } else {
    console.info("ℹ️ Running in Local Preview Mode. To connect your live Firebase project, set your VITE_FIREBASE_* variables in .env.");
  }
}
