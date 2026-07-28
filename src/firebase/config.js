import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC2L5K6zkTT7m153YqtT7kiYwO4TEGh4gA",
  authDomain: "vakrayan-9ce25.firebaseapp.com",
  projectId: "vakrayan-9ce25",
  storageBucket: "vakrayan-9ce25.firebasestorage.app",
  messagingSenderId: "1024899978871",
  appId: "1:1024899978871:web:acad41a79f19bb65a2d872",
  measurementId: "G-T0E6LN63BC"
};

// Initialize Firebase safely to prevent dual-initialization in HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use initializeFirestore with forceLongPolling to bypass Edge Tracking Prevention CORS issues safely
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  // If already initialized (e.g. during Hot Module Replacement), retrieve the existing instance
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// Enable offline persistence for Firestore
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(dbInstance).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore offline persistence failed (multiple tabs open).");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore offline persistence not supported in this browser.");
    }
  });
}

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Safe Messaging Initialization Helper
import { getMessaging, isSupported } from "firebase/messaging";
export const getMessagingInstance = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};
