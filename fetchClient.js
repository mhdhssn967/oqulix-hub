import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import dotenv from 'dotenv';
import fs from 'fs';

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

async function run() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const roles = [];
    usersSnap.forEach(d => roles.push({ id: d.id, ...d.data() }));
    
    // Extract unique userIds (companyIds)
    const userIds = new Set();
    roles.forEach(r => {
      if (r.userIds && Array.isArray(r.userIds)) {
        r.userIds.forEach(uid => { if (uid) userIds.add(uid); });
      }
    });
    
    const uniqueIds = Array.from(userIds);
    console.log(`Found ${uniqueIds.length} unique user IDs.`);
    
    const allData = { roles };
    const subcollections = [
      'employees', 'tasks', 'financialData', 'segments', 
      'attendanceLogs', 'assets', 'payrollLogs', 'clients',
      'bankAccounts', 'vault', 'reimbursements', 'companyInfo'
    ];
    
    allData.userData = {};
    const fetchPromises = [];

    for (const uid of uniqueIds) {
      allData.userData[uid] = {};
      for (const sub of subcollections) {
        const fetchPromise = getDocs(collection(db, `userData/${uid}/${sub}`))
          .then(snap => {
            const docs = [];
            snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
            if (docs.length > 0) {
              allData.userData[uid][sub] = docs;
              console.log(`Fetched ${docs.length} docs for ${uid}/${sub}`);
            }
          })
          .catch(e => {
            console.error(`Failed to fetch ${uid}/${sub}:`, e.message);
          });
        fetchPromises.push(fetchPromise);
      }
    }
    
    await Promise.all(fetchPromises);
    
    fs.writeFileSync('mockData_full.json', JSON.stringify(allData, null, 2));
    console.log('Done generating mock data structure.');
    process.exit(0);
  } catch (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }
}

run();
