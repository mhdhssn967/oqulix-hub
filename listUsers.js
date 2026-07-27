import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function listUsers() {
  const admins = [];
  const managers = [];
  const employees = [];
  
  const aSnap = await getDocs(collection(db, 'admins'));
  aSnap.forEach(d => admins.push({ id: d.id, ...d.data() }));
  
  const mSnap = await getDocs(collection(db, 'manager'));
  mSnap.forEach(d => managers.push({ id: d.id, ...d.data() }));
  
  const eSnap = await getDocs(collection(db, 'employees'));
  eSnap.forEach(d => employees.push({ id: d.id, ...d.data() }));

  console.log("Admins:");
  console.log(admins);
  
  console.log("Managers:");
  console.log(managers);
  
  console.log("Employees:");
  console.log(employees);
}

listUsers();
