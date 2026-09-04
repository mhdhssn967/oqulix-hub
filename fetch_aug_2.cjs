const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function run() {
  const q = db.collection('userData/SbHx5KAgBiXpEYIFyT4ht53alFz1/financialData');
  const snap = await q.get();
  
  const txs = [];
  snap.forEach(doc => {
    const data = doc.data();
    // Assuming date format is YYYY-MM-DD
    if (data.date && data.date.includes('-08-02')) {
      if (data.category && (data.category.toLowerCase().includes('salary') || data.category.toLowerCase().includes('bonus') || data.category.toLowerCase().includes('incentive') || data.remarks?.toLowerCase().includes('salary'))) {
        txs.push(data);
      }
    }
  });
  
  console.log(JSON.stringify(txs, null, 2));
}

run().catch(console.error).finally(() => process.exit(0));
