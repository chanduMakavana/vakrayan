import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
