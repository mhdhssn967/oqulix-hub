import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
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

const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
const segment = 'happymoves';
const colName = 'adLeads';

const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
};

async function uploadDataSmart() {
  try {
    const rawData = fs.readFileSync('adLeads_import.json', 'utf-8');
    const newLeads = JSON.parse(rawData);
    
    const docRef = doc(db, 'userData', companyId, 'segments', segment, 'crmData', colName);
    const snap = await getDoc(docRef);
    
    let existingItems = [];
    if (snap.exists()) {
      const data = snap.data();
      existingItems = data.items || [];
    }
    
    // Set of existing normalized phone numbers
    const existingPhones = new Set();
    existingItems.forEach(item => {
      if (item.contactNo) existingPhones.add(normalizePhone(item.contactNo));
      if (item.contactNumber) existingPhones.add(normalizePhone(item.contactNumber));
      if (item.phone) existingPhones.add(normalizePhone(item.phone));
    });
    
    let addedCount = 0;
    let skippedCount = 0;
    
    const itemsToAdd = [];
    
    newLeads.forEach(lead => {
      // Add the global flag so all employees can see it
      lead.isGlobal = true;
      
      const p1 = normalizePhone(lead.contactNo);
      const p2 = normalizePhone(lead.contactNumber);
      
      // If either phone number is in the set of existing phones, skip it
      if ((p1 && existingPhones.has(p1)) || (p2 && existingPhones.has(p2))) {
        skippedCount++;
      } else {
        itemsToAdd.push(lead);
        if (p1) existingPhones.add(p1);
        if (p2) existingPhones.add(p2);
        addedCount++;
      }
    });
    
    if (itemsToAdd.length > 0) {
      const updatedItems = [...existingItems, ...itemsToAdd];
      await setDoc(docRef, { items: updatedItems }, { merge: true });
    }
    
    console.log(`Successfully added ${addedCount} new leads.`);
    console.log(`Skipped ${skippedCount} duplicates based on existing phone numbers.`);
    console.log(`Total items now in database: ${existingItems.length + addedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Upload failed:", error);
    process.exit(1);
  }
}

uploadDataSmart();
