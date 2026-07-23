import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
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

async function exportData() {
  try {
    const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
    const financialRef = collection(db, `userData/${userId}/financialData`);
    const q = query(financialRef);
    const querySnapshot = await getDocs(q);
    
    const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Date calculation
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const dateLimit = threeMonthsAgo.toISOString().split('T')[0];
    
    const recentTransactions = allTransactions.filter(tx => tx.date >= dateLimit);
    
    recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    fs.writeFileSync('C:\\Users\\huzei\\.gemini\\antigravity-ide\\brain\\e3286506-1fd3-4abc-9ea5-6f2017a82f19\\transactions_last_3_months.json', JSON.stringify(recentTransactions, null, 2));
    
    console.log("Successfully exported " + recentTransactions.length + " transactions.");
    process.exit(0);
  } catch (error) {
    console.error("Error exporting data:", error);
    process.exit(1);
  }
}

exportData();
