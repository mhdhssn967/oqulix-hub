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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1'; // Extracted from your other upload scripts

async function fetchEmployees() {
  try {
    const snap = await getDocs(collection(db, `users`));
    const users = snap.docs.map(doc => ({
      id: doc.id,
      userIds: doc.data().userIds
    }));
    
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error fetching employees:", error);
    process.exit(1);
  }
}

fetchEmployees();
