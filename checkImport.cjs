const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase
const serviceAccountPath = './serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const companyId = 'SbHx5KAgBiXpEYIFyT4ht53alFz1';
  const directCols = ['leads', 'adLeads', 'distributors'];
  
  for (const col of directCols) {
    const targetColPath = `userData/${companyId}/segments/General/crmData/${col}/items`;
    const snap = await db.collection(targetColPath).limit(10).get();
    
    console.log(`Found ${snap.size} items (limit 10) in ${targetColPath}`);
  }
}

check().then(() => process.exit(0)).catch(console.error);
