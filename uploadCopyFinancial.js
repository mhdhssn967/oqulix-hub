import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch, collection } from "firebase/firestore";
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

const data = JSON.parse(fs.readFileSync('./copyfinancial2.json', 'utf8'));

const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function uploadData() {
  try {
    const financialRef = collection(db, `userData/${userId}/financialData`);
    
    const chunkSize = 500;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      chunk.forEach(tx => {
        const id = tx.id || doc(financialRef).id;
        
        // Ensure proper types (e.g. converting string amounts to numbers if necessary)
        const amount = typeof tx.amount === 'string' ? Number(tx.amount) : tx.amount;
        
        batch.set(doc(financialRef, id), {
          ...tx,
          amount,
          userID: userId // Ensuring it points to the correct user ID
        });
      });
      
      await batch.commit();
      console.log(`Uploaded batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(data.length / chunkSize)}`);
    }
    
    console.log("Upload completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error uploading data:", error);
    process.exit(1);
  }
}

uploadData();
