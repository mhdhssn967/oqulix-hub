import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
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

async function checkData() {
  const crmDataLeads = await getDoc(doc(db, `userData/${companyId}/crmData/leads`));
  console.log("crmData/leads exists?", crmDataLeads.exists());
  
  const segmentsRef = collection(db, `userData/${companyId}/segments`);
  const segmentsSnap = await getDocs(segmentsRef);
  console.log("Segments:");
  segmentsSnap.forEach(s => console.log(s.id, s.data()));
  
  process.exit(0);
}

checkData();
