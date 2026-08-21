const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  
  const directCols = ['leads', 'adLeads', 'distributors'];
  for (const col of directCols) {
    const docRef = db.doc(`userData/${companyId}/crmData/${col}`);
    const snap = await docRef.get();
    
    if (snap.exists) {
      const items = snap.data().items || [];
      console.log(`Found ${items.length} items in direct path ${docRef.path}`);
      
      const targetColPath = `userData/${companyId}/segments/General/crmData/${col}/items`;
      console.log(`Migrating to ${targetColPath}...`);
      
      const batchSize = 100;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = db.batch();
        const chunk = items.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const id = item.id || db.collection('tmp').doc().id;
          item.id = id;
          const newRef = db.doc(`${targetColPath}/${id}`);
          batch.set(newRef, item, { merge: true });
        });
        
        await batch.commit();
        console.log(`Migrated ${i + chunk.length} / ${items.length} to ${targetColPath}`);
      }
    } else {
      console.log(`No items found in direct path ${docRef.path}`);
    }
  }
}

migrate().then(() => {
  console.log('Migration completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
