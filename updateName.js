import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

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

async function processDoc(docName) {
  try {
    const docRef = doc(db, "userData", userId, "crmData", docName);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      let data = snap.data().items || [];
      let updatedCount = 0;
      
      const newData = data.map(item => {
        let modified = false;
        const newItem = { ...item };
        for (const key in newItem) {
          if (newItem[key] === 'Navaneeth K n') {
            newItem[key] = 'Navaneeth K N';
            modified = true;
          }
        }
        if (modified) updatedCount++;
        return newItem;
      });
      
      if (updatedCount > 0) {
        await setDoc(docRef, { items: newData });
        console.log(`Updated ${updatedCount} items in ${docName}.`);
      } else {
        console.log(`No updates needed for ${docName}.`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${docName}:`, error);
  }
}

async function main() {
  await processDoc('leads');
  await processDoc('distributors');
  await processDoc('adLeads');
  console.log("Done.");
  process.exit(0);
}

main();
