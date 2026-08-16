// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase compat SDK inside Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyC2L5K6zkTT7m153YqtT7kiYwO4TEGh4gA",
  authDomain: "vakrayan-9ce25.firebaseapp.com",
  projectId: "vakrayan-9ce25",
  storageBucket: "vakrayan-9ce25.firebasestorage.app",
  messagingSenderId: "1024899978871",
  appId: "1:1024899978871:web:acad41a79f19bb65a2d872",
  measurementId: "G-T0E6LN63BC"
});

const messaging = firebase.messaging();

// Intercept and display background notifications
messaging.onBackgroundMessage((payload) => {
  // NOTE: Firebase config in service workers must be hardcoded — SW cannot access
  // build-time environment variables. This is a known Firebase limitation.
  
  const notificationTitle = payload.notification?.title || "Vakrayan";
  const notificationOptions = {
    body: payload.notification?.body || "New updates from Vakrayan!",
    icon: '/vakrayan-favicon.png',
    badge: '/vakrayan-favicon.png',
    vibrate: [100, 50, 100],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
