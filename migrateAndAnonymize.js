import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// OLD CONFIG
const oldConfig = {
  apiKey: "AIzaSyDbALaaI3Sz8bGIovmAxn0ZxfEYdhJqAyk",
  authDomain: "oqulix-hub.firebaseapp.com",
  projectId: "oqulix-hub",
  storageBucket: "oqulix-hub.firebasestorage.app",
  messagingSenderId: "972791813653",
  appId: "1:972791813653:web:e65feb4f3d233b6bac601c",
  measurementId: "G-0R072HF3Y7"
};

// NEW CONFIG
const newConfig = {
  apiKey: "AIzaSyA3-2GbzNSBHv__hfaJzvqIdgV_ozvVgfE",
  authDomain: "interlix-2d61f.firebaseapp.com",
  projectId: "interlix-2d61f",
  storageBucket: "interlix-2d61f.firebasestorage.app",
  messagingSenderId: "106645468469",
  appId: "1:106645468469:web:e4ffc62c4d7eb6e9a8087c",
  measurementId: "G-KPY7Z9GJEX"
};

const oldApp = initializeApp(oldConfig, 'oldApp');
const newApp = initializeApp(newConfig, 'newApp');

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

const randomString = (len) => Math.random().toString(36).substring(2, 2 + len);
const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const mockNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'];
const mockLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const mockCompanies = ['Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp'];
const mockRemarks = ['Payment for services', 'Monthly invoice', 'Consulting fee', 'Software license', 'Hardware purchase'];

const getName = () => `${mockNames[randomNum(0, mockNames.length - 1)]} ${mockLastNames[randomNum(0, mockLastNames.length - 1)]}`;
const getEmail = (name) => `${name.replace(' ', '.').toLowerCase()}@example.com`;

const anonymizeData = (collectionName, data) => {
  let d = { ...data };
  
  if (collectionName === 'employees') {
    d.name = getName();
    if (d.email) {
      if (!d.name) d.name = getName();
      d.email = getEmail(d.name);
    }
    if (d.phone) d.phone = `+1555${randomNum(100000, 999999)}`;
    if (d.address) d.address = `${randomNum(100, 999)} Fake St`;
    if (d.bankAccount) d.bankAccount = `${randomNum(1000000000, 9999999999)}`;
  }
  
  if (collectionName === 'clients') {
    d.name = getName();
    if (d.email) {
      if (!d.name) d.name = getName();
      d.email = getEmail(d.name);
    }
    if (d.companyName) d.companyName = mockCompanies[randomNum(0, mockCompanies.length - 1)];
    if (d.phone) d.phone = `+1555${randomNum(100000, 999999)}`;
  }

  if (collectionName === 'tasks') {
    if (d.title) d.title = `Task - ${randomString(4).toUpperCase()}`;
    if (d.description) d.description = 'Mocked task description...';
  }

  if (collectionName === 'financialData') {
    if (d.amount) {
      let original = parseFloat(d.amount);
      if (!isNaN(original)) {
         let vary = (randomNum(70, 130) / 100);
         d.amount = (original * vary).toFixed(2);
      }
    }
    if (d.remarks || d.description) {
       d.remarks = mockRemarks[randomNum(0, mockRemarks.length - 1)];
       d.description = d.remarks;
    }
  }

  if (collectionName === 'items' || collectionName === 'leads' || collectionName === 'adLeads' || collectionName === 'distributors') {
    // CRM Items
    if (d.name) d.name = getName();
    if (d.email) {
      if (!d.name) d.name = getName();
      d.email = getEmail(d.name);
    }
    if (d.phone) d.phone = `+1555${randomNum(100000, 999999)}`;
    if (d.company) d.company = mockCompanies[randomNum(0, mockCompanies.length - 1)];
    if (d.amount) {
      let original = parseFloat(d.amount);
      if (!isNaN(original)) {
         d.amount = Math.round(original * (randomNum(70, 130) / 100));
      }
    }
    if (d.comments || d.remarks) {
      d.comments = 'Interested in services...';
    }
  }

  return d;
};

// UID Mapping map (from our previous registration)
// Read from demo_data_remapped.json if possible to keep auth accounts matched
const mappingDataStr = fs.readFileSync('demo_data_remapped.json', 'utf8');
const extractUidMap = () => {
  const map = new Map();
  // To keep this simple and since we already successfully injected, we can just fetch old UIDs and let them be!
  // Wait, if we keep old UIDs, the admin account we just created (DG6F3uyxkda3Xg5iPNQmVNsMOMW2) won't have access unless we map it.
  // Actually, we can just replace 'SbHx5KAgBiXpEYIFyT4ht53alFz1' with 'DG6F3uyxkda3Xg5iPNQmVNsMOMW2' globally!
  return map;
};

async function migrate() {
  try {
    const ops = [];
    const pushOp = (path, docId, data, colName) => {
      let finalPath = `${path}/${docId}`;
      finalPath = finalPath.replace('SbHx5KAgBiXpEYIFyT4ht53alFz1', 'DG6F3uyxkda3Xg5iPNQmVNsMOMW2');
      ops.push({ ref: doc(newDb, finalPath), data: anonymizeData(colName, data) });
    };

    console.log("Fetching roles...");
    const usersSnap = await getDocs(collection(oldDb, 'users'));
    usersSnap.forEach(d => {
      let data = d.data();
      if (data.userIds) {
        data.userIds = data.userIds.map(uid => uid === 'SbHx5KAgBiXpEYIFyT4ht53alFz1' ? 'DG6F3uyxkda3Xg5iPNQmVNsMOMW2' : uid);
      }
      ops.push({ ref: doc(newDb, 'users', d.id), data });
    });

    const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
    
    const rootSubs = [
      'employees', 'tasks', 'financialData', 'segments', 
      'attendanceLogs', 'assets', 'payrollLogs', 'clients',
      'bankAccounts', 'vault', 'reimbursements', 'companyInfo', 'settings'
    ];

    for (const sub of rootSubs) {
      console.log(`Fetching userData/${companyId}/${sub}...`);
      const snap = await getDocs(collection(oldDb, `userData/${companyId}/${sub}`));
      for (const d of snap.docs) {
        pushOp(`userData/${companyId}/${sub}`, d.id, d.data(), sub);
        
        // DEEP FETCH FOR SEGMENTS
        if (sub === 'segments') {
          const segId = d.id;
          const crmSnap = await getDocs(collection(oldDb, `userData/${companyId}/segments/${segId}/crmData`));
          for (const c of crmSnap.docs) {
            pushOp(`userData/${companyId}/segments/${segId}/crmData`, c.id, c.data(), 'crmData');
            
            const itemsSnap = await getDocs(collection(oldDb, `userData/${companyId}/segments/${segId}/crmData/${c.id}/items`));
            for (const item of itemsSnap.docs) {
              pushOp(`userData/${companyId}/segments/${segId}/crmData/${c.id}/items`, item.id, item.data(), 'items');
            }
          }
        }
      }
    }

    console.log(`Prepared ${ops.length} documents for migration.`);

    let operations = 0;
    for (let i = 0; i < ops.length; i += 500) {
      const batch = writeBatch(newDb);
      const chunk = ops.slice(i, i + 500);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
      operations += chunk.length;
      console.log(`Injected ${operations}/${ops.length} documents...`);
    }

    console.log(`Migration and Anonymization Complete!`);
    process.exit(0);

  } catch(e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

migrate();
