import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const config = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    config[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
});

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function migrate() {
  console.log("Migrating data to happymoves segment...");
  
  // Create happymoves segment metadata
  await setDoc(doc(db, `userData/${companyId}/segments/happymoves`), {
    name: 'Happy Moves',
    clients: [] // Default empty clients for now
  }, { merge: true });

  // Move leads
  const leadsDoc = await getDoc(doc(db, `userData/${companyId}/crmData/leads`));
  if (leadsDoc.exists()) {
    await setDoc(doc(db, `userData/${companyId}/segments/happymoves/crmData/leads`), leadsDoc.data());
    console.log("Migrated leads");
  }

  // Move adLeads
  const adLeadsDoc = await getDoc(doc(db, `userData/${companyId}/crmData/adLeads`));
  if (adLeadsDoc.exists()) {
    await setDoc(doc(db, `userData/${companyId}/segments/happymoves/crmData/adLeads`), adLeadsDoc.data());
    console.log("Migrated adLeads");
  }

  // Move distributors
  const distDoc = await getDoc(doc(db, `userData/${companyId}/crmData/distributors`));
  if (distDoc.exists()) {
    await setDoc(doc(db, `userData/${companyId}/segments/happymoves/crmData/distributors`), distDoc.data());
    console.log("Migrated distributors");
  }

  console.log("Done");
  process.exit(0);
}

migrate();
