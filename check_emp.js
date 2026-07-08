import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
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

async function checkEmp() {
  const sakeerId = '6dJMJHOtJpQflLbPi4aYPyEWmft1';
  const navId = 'TGCUg8xyPlSWiXKML8M5A7xwuB82';
  
  const [sSnap, nSnap] = await Promise.all([
    getDoc(doc(db, 'employees', sakeerId)),
    getDoc(doc(db, 'employees', navId))
  ]);
  
  console.log("Sakeer exists:", sSnap.exists(), sSnap.data());
  console.log("Navaneeth exists:", nSnap.exists(), nSnap.data());
}

checkEmp().then(() => process.exit(0));
