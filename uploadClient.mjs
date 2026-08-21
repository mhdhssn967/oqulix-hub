import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";
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

async function uploadFile(filePath, collectionName) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  // Use the exact path the user requested!
  const targetColPath = `userData/${companyId}/crm/${collectionName}/items`;
  
  console.log(`Loading data from ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = Array.isArray(data) ? data : (data.items || []);
  
  console.log(`Found ${items.length} items to upload to ${targetColPath}`);
  
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    
    // Client SDK batch
    let batch = writeBatch(db);
    
    chunk.forEach(item => {
      // Process timestamps correctly for Client SDK
      if (item.createdAt && item.createdAt.seconds) {
        item.createdAt = new Date(item.createdAt.seconds * 1000);
      }
      if (item.updatedAt && item.updatedAt.seconds) {
        item.updatedAt = new Date(item.updatedAt.seconds * 1000);
      }
      
      const id = item.id || doc(collection(db, 'tmp')).id;
      item.id = id;
      const newRef = doc(db, targetColPath, id);
      batch.set(newRef, item, { merge: true });
    });
    
    await batch.commit();
    console.log(`Uploaded ${Math.min(i + batchSize, items.length)} / ${items.length} items for ${collectionName}`);
  }
}

async function run() {
  const files = [
    { path: './public/regular_leads_backup_2026-08-21 (2).json', col: 'leads' },
    { path: './public/ad_leads_backup_2026-08-21.json', col: 'adLeads' },
    { path: './public/distributors_backup_2026-08-21.json', col: 'distributors' }
  ];

  for (const file of files) {
    await uploadFile(file.path, file.col);
  }
}

run().then(() => {
  console.log('JSON upload completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
