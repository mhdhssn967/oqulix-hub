import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, writeBatch } from "firebase/firestore";
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

const data = JSON.parse(fs.readFileSync('./public/OqulixFinance_Overview_2026-07-06.json', 'utf8'));

const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
const userRef = doc(db, 'userData', userId);

async function uploadData() {
  try {
    // 1. Company Profile
    await setDoc(doc(db, `userData/${userId}/companyprofile/profile`), {
      companyName: data.companyName,
      generatedAt: data.generatedAt,
      view: data.view,
      dateFilter: data.dateFilter
    });
    console.log("Company profile uploaded");

    // 2. Preferences
    await setDoc(doc(db, `userData/${userId}/preferences/prefs`), data.preferences);
    console.log("Preferences uploaded");

    // 3. Financial Data (Expenses and Revenue)
    const financialRef = collection(db, `userData/${userId}/financialData`);
    
    // Combine expenses and revenue
    const allTransactions = [
      ...(data.expenses || []).map(e => ({ ...e, isExpense: true })),
      ...(data.revenue || []).map(r => ({ ...r, isRevenue: true }))
    ];

    const chunkSize = 500;
    
    for (let i = 0; i < allTransactions.length; i += chunkSize) {
      const chunk = allTransactions.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach(tx => {
        const id = tx.id || doc(financialRef).id;
        batch.set(doc(financialRef, id), tx);
      });
      
      await batch.commit();
      console.log(`Uploaded batch ${i / chunkSize + 1} of ${Math.ceil(allTransactions.length / chunkSize)}`);
    }
    
    console.log("Upload completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error uploading data:", error);
    process.exit(1);
  }
}

uploadData();

