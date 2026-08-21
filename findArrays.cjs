const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';

async function findArrays() {
  const pathsFound = [];
  
  // Recursively search
  async function searchCol(colRef) {
    const docs = await colRef.get();
    for (const d of docs.docs) {
      const data = d.data();
      if (data.items && Array.isArray(data.items)) {
        pathsFound.push({ path: d.ref.path, count: data.items.length });
      }
      
      const subcols = await d.ref.listCollections();
      for (const sub of subcols) {
        await searchCol(sub);
      }
    }
  }
  
  await searchCol(db.collection('userData'));
  
  fs.writeFileSync('found_arrays.txt', JSON.stringify(pathsFound, null, 2));
  console.log('Search complete. Results written to found_arrays.txt');
}

findArrays().then(() => process.exit(0)).catch(console.error);
