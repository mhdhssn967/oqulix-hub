import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyA3-2GbzNSBHv__hfaJzvqIdgV_ozvVgfE",
  authDomain: "interlix-2d61f.firebaseapp.com",
  projectId: "interlix-2d61f",
  storageBucket: "interlix-2d61f.firebasestorage.app",
  messagingSenderId: "106645468469",
  appId: "1:106645468469:web:e4ffc62c4d7eb6e9a8087c",
  measurementId: "G-KPY7Z9GJEX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inject() {
  try {
    const rawData = JSON.parse(fs.readFileSync('demo_data.json', 'utf8'));
    let operations = 0;
    
    // We will collect all write operations into batches
    const ops = [];

    if (rawData.roles) {
      for (const role of rawData.roles) {
        const id = role.id;
        delete role.id;
        ops.push({ ref: doc(db, 'users', id), data: role });
      }
    }

    if (rawData.userData) {
      for (const userId in rawData.userData) {
        const collections = rawData.userData[userId];
        for (const subName in collections) {
          const docs = collections[subName];
          for (const d of docs) {
            const id = d.id;
            delete d.id;
            ops.push({ ref: doc(db, `userData/${userId}/${subName}`, id), data: d });
          }
        }
      }
    }

    console.log(`Found ${ops.length} documents to inject. Executing in batches of 500...`);
    
    for (let i = 0; i < ops.length; i += 500) {
      const batch = writeBatch(db);
      const chunk = ops.slice(i, i + 500);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
      operations += chunk.length;
      console.log(`Injected ${operations}/${ops.length} documents...`);
    }

    console.log(`Successfully injected ${operations} documents into Firestore.`);
    process.exit(0);
  } catch (error) {
    console.error("Injection failed:", error);
    process.exit(1);
  }
}

inject();
