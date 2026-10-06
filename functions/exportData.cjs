const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('../serviceAccountKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function run() {
  const collections = await db.listCollections();
  const dbData = {};

  for (const collection of collections) {
    console.log('Fetching collection:', collection.id);
    const snapshot = await collection.get();
    const docs = [];
    
    // For nested structure, this only fetches root collections. 
    // We'll see what root collections exist.
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    dbData[collection.id] = docs;
  }
  
  fs.writeFileSync('../exportedData.json', JSON.stringify(dbData, null, 2));
  console.log('Export complete');
}

run().catch(console.error).finally(() => process.exit(0));
