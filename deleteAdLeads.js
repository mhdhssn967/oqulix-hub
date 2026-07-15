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

async function revertData() {
  try {
    const rawData = fs.readFileSync('adLeads_import.json', 'utf-8');
    const importedLeads = JSON.parse(rawData);
    
    // Create a Set of all the IDs that were just imported
    const idsToRemove = new Set(importedLeads.map(lead => lead.id));
    
    const docRef = doc(db, 'userData', companyId, 'segments', segment, 'crmData', colName);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      const currentItems = data.items || [];
      const originalCount = currentItems.length;
      
      // Filter out any item whose ID is in the idsToRemove set
      const revertedItems = currentItems.filter(item => !idsToRemove.has(item.id));
      
      await setDoc(docRef, { items: revertedItems }, { merge: true });
      
      console.log(`Reverted successfully. Removed ${originalCount - revertedItems.length} imported items. Total items now: ${revertedItems.length}`);
    } else {
      console.log('Document not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Revert failed:", error);
    process.exit(1);
  }
}

revertData();
