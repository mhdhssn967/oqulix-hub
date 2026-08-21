const admin = require('firebase-admin');
const fs = require('fs');

// Use the absolute path to the known service account key
const serviceAccountPath = 'D:\\Oqulix\\Oqulix Projects\\Oqulix_ERP\\New_CRM\\functions\\serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function convertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new admin.firestore.Timestamp(obj.seconds, obj.nanoseconds);
  }
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      obj[key] = convertTimestamps(obj[key]);
    }
  }
  return obj;
}

async function uploadFile(filePath, collectionName) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  // EXACT path requested by the user
  const targetColPath = `userData/${companyId}/crm/${collectionName}/items`;
  
  console.log(`Loading data from ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = Array.isArray(data) ? data : (data.items || []);
  
  console.log(`Found ${items.length} items to upload to ${targetColPath}`);
  
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = db.batch();
    const chunk = items.slice(i, i + batchSize);
    
    chunk.forEach(rawItem => {
      const item = convertTimestamps(rawItem);
      const id = item.id || db.collection('tmp').doc().id;
      item.id = id;
      const newRef = db.doc(`${targetColPath}/${id}`);
      batch.set(newRef, item, { merge: true });
    });
    
    await batch.commit();
    console.log(`Uploaded ${Math.min(i + batchSize, items.length)} / ${items.length} items for ${collectionName}`);
  }
}

async function run() {
  const files = [
    { path: 'D:\\Oqulix\\Oqulix Projects\\New_CRM\\public\\regular_leads_backup_2026-08-21 (2).json', col: 'leads' },
    { path: 'D:\\Oqulix\\Oqulix Projects\\New_CRM\\public\\ad_leads_backup_2026-08-21.json', col: 'adLeads' },
    { path: 'D:\\Oqulix\\Oqulix Projects\\New_CRM\\public\\distributors_backup_2026-08-21.json', col: 'distributors' }
  ];

  for (const file of files) {
    await uploadFile(file.path, file.col);
  }
}

run().then(() => {
  console.log('JSON upload completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
