import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
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
const sakeerUid = '6dJMJHOtJpQflLbPi4aYPyEWmft1';

async function fixLeads() {
  try {
    const docRef = doc(db, 'userData', companyId, 'segments', segment, 'crmData', colName);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      console.log('Document not found!');
      process.exit(1);
    }

    const data = snap.data();
    let items = data.items || [];
    let updatedCount = 0;
    
    const newItems = items.map(item => {
      if (item.assignedToUid === sakeerUid && item.userId !== sakeerUid) {
        item.userId = sakeerUid;
        updatedCount++;
      }
      return item;
    });

    if (updatedCount > 0) {
      await setDoc(docRef, { items: newItems }, { merge: true });
      console.log(`Successfully updated ${updatedCount} leads so Sakeer can view them.`);
    } else {
      console.log('No leads needed updating.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

fixLeads();
