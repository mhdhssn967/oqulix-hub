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

const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
const newUserId = 'RjGz4Fh3lpSaRXcvvCig8k4OghL2';

async function processCollection(colName) {
  const docRef = doc(db, 'userData', userId, 'crmData', colName);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    console.log(`Document for ${colName} does not exist.`);
    return;
  }

  const data = snap.data();
  if (!data.items || !Array.isArray(data.items)) {
    console.log(`No items array in ${colName}.`);
    return;
  }

  let modifiedCount = 0;
  const newItems = data.items.map(item => {
    const checkName = (name) => typeof name === 'string' && name.trim() === 'Mohammed Hussain A';
    
    const isMohammed = checkName(item.employeeName) || 
                       checkName(item.associate) || 
                       checkName(item.assignedToName) ||
                       checkName(item.addedByName);

    if (isMohammed) {
      delete item.associate;
      item.userId = 'RjGz4Fh3lpSaRXcvvCig8k4OghL2';
      modifiedCount++;
    }
    return item;
  });

  if (modifiedCount > 0) {
    await updateDoc(docRef, { items: newItems });
    console.log(`Updated ${modifiedCount} items in ${colName}.`);
  } else {
    console.log(`No matching items found in ${colName}.`);
  }
}

async function runMigration() {
  try {
    console.log("Starting migration for Mohammed Hussain A...");
    await processCollection('leads');
    await processCollection('adLeads');
    await processCollection('distributors');
    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
