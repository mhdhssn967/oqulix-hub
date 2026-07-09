import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
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

async function checkManager() {
  const snap = await getDocs(collection(db, 'manager'));
  snap.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
  console.log("Done");
  process.exit(0);
}
checkManager();
