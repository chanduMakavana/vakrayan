// ✅ Firebase Adapter — Vite aliases "firebase" → src/firebase/adapter.js
// So this import actually loads the Firebase Client class, NOT the Firebase SDK.
// All services (orders.js, cart.js, etc.) use this shared client instance.
import { Client } from '../firebase/adapter.js';

/**
 * Shared Client Instance — Single Instance.
 *
 * Even though this looks like Firebase code, the Vite alias in vite.config.js
 * redirects 'firebase' → 'src/firebase/adapter.js'.
 * So `Client` here is actually the Firebase-backed Client class from adapter.js.
 *
 * The endpoint and project values are ignored by the Firebase adapter
 * (Firebase uses its own config from src/firebase/config.js).
 */
export const client = new Client()
  .setEndpoint('firebase')
  .setProject('firebase');

