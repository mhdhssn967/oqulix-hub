// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDbALaaI3Sz8bGIovmAxn0ZxfEYdhJqAyk",
  authDomain: "oqulix-hub.firebaseapp.com",
  projectId: "oqulix-hub",
  storageBucket: "oqulix-hub.firebasestorage.app",
  messagingSenderId: "972791813653",
  appId: "1:972791813653:web:e65feb4f3d233b6bac601c"
};

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo_transp.png' // Make sure you have this icon in public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
