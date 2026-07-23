import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocs, updateDoc, collection } from "firebase/firestore";
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

const data = JSON.parse(fs.readFileSync('./clients-data-Ovq274qYz5f065l6zbzMRafVFfl1 (1).json', 'utf8'));
const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function updateData() {
  try {
    const clientsRef = collection(db, `userData/${userId}/clients`);
    const snapshot = await getDocs(clientsRef);
    const existingClients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const newClient of data) {
      // Find matching client by serial
      const match = existingClients.find(c => c.serial === newClient.serial);
      if (match) {
        const docRef = doc(db, `userData/${userId}/clients`, match.id);
        await updateDoc(docRef, {
          clientInformation: newClient.clientInformation || {},
          remarks: newClient.remarks || ""
        });
        console.log(`Updated client: ${match.clientName}`);
      }
    }
    
    console.log("Update completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error updating data:", error);
    process.exit(1);
  }
}

updateData();
