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

const adminId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

const targets = {
  'Sakeer Shamsudheen': '6dJMJHOtJpQflLbPi4aYPyEWmft1',
  'Navaneeth K N': 'TGCUg8xyPlSWiXKML8M5A7xwuB82',
  'Navaneeth K n': 'TGCUg8xyPlSWiXKML8M5A7xwuB82' // Handling the edge case from previous instructions
};

async function processCollection(colName) {
  const docRef = doc(db, 'userData', adminId, 'crmData', colName);
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
    let matchedId = null;
    let matchedName = null;

    const checkAndMatch = (nameFieldValue) => {
      if (typeof nameFieldValue !== 'string') return false;
      const trimmed = nameFieldValue.trim();
      if (targets[trimmed]) {
        matchedId = targets[trimmed];
        matchedName = trimmed === 'Navaneeth K n' ? 'Navaneeth K N' : trimmed; // normalize name
        return true;
      }
      return false;
    };

    const isMatch = checkAndMatch(item.employeeName) || 
                    checkAndMatch(item.associate) || 
                    checkAndMatch(item.assignedToName) ||
                    checkAndMatch(item.addedByName);

    if (isMatch && matchedId) {
      delete item.associate;
      item.userId = matchedId;
      
      // Also normalize the name field if it was "Navaneeth K n"
      if (item.employeeName && item.employeeName.trim().toLowerCase() === 'navaneeth k n') item.employeeName = matchedName;
      if (item.assignedToName && item.assignedToName.trim().toLowerCase() === 'navaneeth k n') item.assignedToName = matchedName;
      if (item.addedByName && item.addedByName.trim().toLowerCase() === 'navaneeth k n') item.addedByName = matchedName;

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
    console.log("Starting migration for Sakeer and Navaneeth...");
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
