import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyDbALaaI3Sz8bGIovmAxn0ZxfEYdhJqAyk",
  authDomain: "oqulix-hub.firebaseapp.com",
  projectId: "oqulix-hub",
  storageBucket: "oqulix-hub.firebasestorage.app",
  messagingSenderId: "972791813653",
  appId: "1:972791813653:web:e65feb4f3d233b6bac601c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function uploadDataAsDocument(filePath, docName) {
  try {
    console.log(`Starting upload for ${docName} from ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const docRef = doc(db, "userData", userId, "crmData", docName);
    await setDoc(docRef, { items: data });
    
    console.log(`Successfully uploaded ${data.length} items into the single document: ${docName}.`);
  } catch (error) {
    console.error(`Error uploading data for ${docName}:`, error);
  }
}

async function main() {
  await uploadDataAsDocument('public/leads_2026-07-08.json', 'leads');
  await uploadDataAsDocument('public/distributors_2026-07-08.json', 'distributors');
  await uploadDataAsDocument('public/adleads_2026-07-08.json', 'adLeads');
  
  console.log("All uploads completed. Exiting.");
  process.exit(0);
}

main();
