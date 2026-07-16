import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance, db } from "../firebase/config";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

/**
 * Requests browser permission for notifications, registers the Service Worker,
 * retrieves the Firebase Cloud Messaging registration token, and saves it in Firestore.
 * @param {string} userId - The logged-in user's unique ID.
 * @returns {Promise<string|null>} The FCM token if successful, otherwise null.
 */
export const requestNotificationPermission = async (userId) => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn("FCM is not supported on this browser.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied by user.");
      return null;
    }

    // Get VAPID Key from environment variables (or fallback to placeholder)
    const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
    
    // Register the FCM service worker specifically
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log("FCM Token obtained:", token);
      if (userId) {
        await saveTokenToFirestore(userId, token);
      }
      return token;
    } else {
      console.warn("No FCM token returned. Check VAPID key configuration.");
      return null;
    }
  } catch (error) {
    console.error("Error setting up push notifications:", error);
    return null;
  }
};

/**
 * Saves the FCM token to Firestore under the user's document inside an fcmTokens array.
 */
const saveTokenToFirestore = async (userId, token) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      fcmTokens: arrayUnion(token),
      notificationsEnabled: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("FCM Token successfully saved to Firestore for user:", userId);
  } catch (error) {
    console.error("Failed to save FCM token to Firestore:", error);
  }
};

/**
 * Listens for incoming notifications when the app is active in the foreground.
 */
export const listenForForegroundMessages = async () => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log("Foreground notification received:", payload);
      
      const title = payload.notification?.title || "Vakrayan";
      const body = payload.notification?.body || "New update!";
      
      // Trigger a native browser notification in the foreground
      if (Notification.permission === "granted") {
        const options = {
          body,
          icon: "/vakrayan-favicon.png",
          badge: "/vakrayan-favicon.png"
        };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, options);
          }).catch((err) => {
            console.error("Foreground notification SW failed, using fallback:", err);
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      }
    });
  } catch (error) {
    console.error("Error setting up foreground message listener:", error);
  }
};
