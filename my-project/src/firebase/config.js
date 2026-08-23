import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC2L5K6zkTT7m153YqtT7kiYwO4TEGh4gA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vakrayan-9ce25.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vakrayan-9ce25",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vakrayan-9ce25.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1024899978871",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1024899978871:web:acad41a79f19bb65a2d872",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-T0E6LN63BC"
};

// Initialize Firebase safely to prevent dual-initialization in HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use initializeFirestore with autoDetectLongPolling to bypass Safari/iOS ITP CORS issues
// experimentalAutoDetectLongPolling replaces the deprecated experimentalForceLongPolling
// and correctly handles both Listen and Write channels via long-polling when needed
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  // If already initialized (e.g. during Hot Module Replacement), retrieve the existing instance
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Safe Messaging Initialization Helper with Dynamic Import
export const getMessagingInstance = async () => {
  if (typeof window !== "undefined") {
    try {
      const { getMessaging, isSupported } = await import("firebase/messaging");
      if (await isSupported()) {
        return getMessaging(app);
      }
    } catch {
      return null;
    }
  }
  return null;
};
