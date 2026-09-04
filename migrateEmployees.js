import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs, updateDoc, doc } from "firebase/firestore";
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

async function migrate() {
  try {
    console.log("Fetching all employees...");
    const employeesSnapshot = await getDocs(collectionGroup(db, 'employees'));
    
    let counter = 2301;
    let updated = 0;
    
    for (const employeeDoc of employeesSnapshot.docs) {
      const data = employeeDoc.data();
      const newId = `OQ-${counter}`;
      
      console.log(`Updating employee ${employeeDoc.id} (${data.name}) -> ${newId}`);
      await updateDoc(employeeDoc.ref, {
        employeeId: newId
      });
      
      counter++;
      updated++;
    }
    
    console.log(`Migration complete. Updated ${updated} employees.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
