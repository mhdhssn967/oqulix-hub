import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from 'fs';
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

const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
const segment = 'happymoves';
const colName = 'adLeads';

async function uploadData() {
  try {
    const rawData = fs.readFileSync('adLeads_import.json', 'utf-8');
    const newLeads = JSON.parse(rawData);
    
    const docRef = doc(db, 'userData', companyId, 'segments', segment, 'crmData', colName);
    const snap = await getDoc(docRef);
    
    let existingItems = [];
    if (snap.exists()) {
      const data = snap.data();
      existingItems = data.items || [];
    }
    
    const updatedItems = [...existingItems, ...newLeads];
    
    await setDoc(docRef, { items: updatedItems }, { merge: true });
    
    console.log(`Successfully added ${newLeads.length} leads. Total items now: ${updatedItems.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Upload failed:", error);
    process.exit(1);
  }
}

uploadData();
