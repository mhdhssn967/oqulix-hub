import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

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

async function main() {
  try {
    const segmentsSnap = await getDocs(collection(db, 'userData', userId, 'segments'));
    const segments = Array.from(new Set(['General', 'happymoves', 'gamefaktory', ...segmentsSnap.docs.map(d => d.id)]));
    
    const allClients = [];
    const clientSet = new Set(); // To prevent duplicates

    for (const segment of segments) {
      console.log(`Processing segment: ${segment}`);
      
      const collectionsToFetch = ['leads', 'adLeads', 'distributors'];
      
      for (const col of collectionsToFetch) {
        const docRef = doc(db, 'userData', userId, 'segments', segment, 'crmData', col);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const items = snap.data().items || [];
          
          items.forEach(item => {
            const name = item.clientName || item.name || item.distributorName;
            const associate = item.assignedToName || item.employeeName || item.addedByName || 'Unknown Associate';
            
            if (name) {
              const formattedName = `${name} (${associate})`;
              
              if (!clientSet.has(formattedName)) {
                clientSet.add(formattedName);
                allClients.push({
                  clientName: name,
                  associateName: associate,
                  segment: segment,
                  formattedString: formattedName
                });
              }
            }
          });
        }
      }
    }
    
    // Save to segments/General/crmData/allClients
    const globalRef = doc(db, 'userData', userId, 'segments', 'General', 'crmData', 'allClients');
    await setDoc(globalRef, { clients: allClients }, { merge: true });
    
    console.log(`Successfully extracted and saved ${allClients.length} clients to 'userData/${userId}/globalData/clients'.`);
    process.exit(0);
  } catch (error) {
    console.error("Error extracting clients:", error);
    process.exit(1);
  }
}

main();
