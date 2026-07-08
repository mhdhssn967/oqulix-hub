import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const adminId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function checkData() {
  const snap = await getDoc(doc(db, 'userData', adminId, 'crmData', 'leads'));
  if (snap.exists()) {
    const items = snap.data().items;
    const sakeer = items.find(i => i.userId === '6dJMJHOtJpQflLbPi4aYPyEWmft1');
    console.log("Sakeer lead:", sakeer);
  } else {
    console.log("no leads");
  }
}

checkData().then(() => process.exit(0));
