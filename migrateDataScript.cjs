const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  
  // Also check the exact path the user mentioned
  const directCols = ['leads', 'adLeads', 'distributors'];
  for (const col of directCols) {
    const docRef = db.doc(`userData/${companyId}/crmData/${col}`);
    const snap = await docRef.get();
    if (snap.exists) {
      const items = snap.data().items || [];
      console.log(`Found ${items.length} items in exact path ${docRef.path}`);
      await migrateItems(items, `userData/${companyId}/crmData/${col}/items`);
    } else {
      console.log(`No items found in direct path ${docRef.path}`);
    }
  }

  // Check segments as per CRM.jsx
  const segmentsSnap = await db.collection(`userData/${companyId}/segments`).get();
  console.log(`Found segments: ${segmentsSnap.docs.map(d => d.id).join(', ')}`);
  
  for (const docSnap of segmentsSnap.docs) {
    const seg = docSnap.id;
    for (const col of directCols) {
      const docRef = db.doc(`userData/${companyId}/segments/${seg}/crmData/${col}`);
      const snap = await docRef.get();
      if (snap.exists) {
        const items = snap.data().items || [];
        console.log(`Found ${items.length} items in ${docRef.path}`);
        await migrateItems(items, `userData/${companyId}/segments/${seg}/crmData/${col}/items`);
      }
    }
  }
}

async function migrateItems(items, targetColPath) {
  if (!items || items.length === 0) return;
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = db.batch();
    const chunk = items.slice(i, i + batchSize);
    chunk.forEach(item => {
      const id = item.id || db.collection('tmp').doc().id;
      item.id = id;
      const newRef = db.doc(`${targetColPath}/${id}`);
      batch.set(newRef, item);
    });
    await batch.commit();
    console.log(`Migrated ${i + chunk.length} / ${items.length} to ${targetColPath}`);
  }
}

migrate().then(() => {
  console.log('Migration completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
